import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { notifyTaskAssignment, notifyMemberAdded } from '../../../lib/notifications'
import { logActivity } from '../../../lib/activity'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'invalid id' })

  // Require authentication for all methods
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })
  
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email }
  })
  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' })

  // Get the task to check project access
  const task = await prisma.task.findUnique({
    where: { id: String(id) },
    include: { project: true }
  })
  
  if (!task) return res.status(404).json({ error: 'Task not found' })

  // Check authorization: user must own the project or be in the organization
  let hasAccess = false
  if (task.project.ownerId === currentUser.id) {
    hasAccess = true
  } else if (task.project.organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: task.project.organizationId,
          userId: currentUser.id
        }
      }
    })
    hasAccess = !!membership
  }

  if (!hasAccess) {
    return res.status(403).json({ error: 'You do not have access to this task' })
  }

  if (req.method === 'PATCH') {
    const updates = req.body
    
    // Get current task state for comparison
    const currentTask = await prisma.task.findUnique({
      where: { id: String(id) },
      include: {
        members: true
      }
    })
    
    // allow updating title, description, status, priority, assigneeId, dueDate, labelIds
    const allowed: any = {}
    if (updates.title) allowed.title = updates.title
    if (updates.description !== undefined) allowed.description = updates.description
    if (updates.status) allowed.status = updates.status
    if (updates.priority !== undefined) allowed.priority = updates.priority
    if (updates.coverColor !== undefined) allowed.coverColor = updates.coverColor
    if (updates.assigneeId) allowed.assigneeId = updates.assigneeId
    if (updates.dueDate) allowed.dueDate = new Date(updates.dueDate)

    // Notify on task assignment
    if (updates.assigneeId && currentTask && updates.assigneeId !== currentTask.assigneeId && currentUser) {
      await notifyTaskAssignment(
        String(id),
        currentTask.title,
        updates.assigneeId,
        currentUser.name || currentUser.email
      )
    }

    // handle labels (expects an array of label IDs)
    if (Array.isArray(updates.labelIds)) {
      // For explicit many-to-many with join table, we need to delete old and create new
      // First, delete existing labels for this task
      await prisma.taskLabel.deleteMany({
        where: { taskId: String(id) }
      })
      // Then create new label associations
      if (updates.labelIds.length > 0) {
        await prisma.taskLabel.createMany({
          data: updates.labelIds.map((lid: string) => ({
            taskId: String(id),
            labelId: String(lid)
          }))
        })
      }
    }

    // handle members (expects an array of user IDs)
    if (Array.isArray(updates.memberIds) && currentTask && currentUser) {
      const currentMemberIds = currentTask.members.map(m => m.userId)
      const newMemberIds = updates.memberIds.filter((uid: string) => !currentMemberIds.includes(uid))
      
      // Delete existing members and create new ones
      await prisma.taskMember.deleteMany({
        where: { taskId: String(id) }
      })
      
      if (updates.memberIds.length > 0) {
        await prisma.taskMember.createMany({
          data: updates.memberIds.map((uid: string) => ({
            taskId: String(id),
            userId: String(uid)
          }))
        })
      }
      
      // Notify newly added members
      for (const memberId of newMemberIds) {
        await notifyMemberAdded(
          memberId,
          String(id),
          currentTask.title,
          currentUser.name || currentUser.email
        )
      }
    }

    const task = await prisma.task.update({ 
      where: { id: String(id) }, 
      data: allowed, 
      include: { 
        labels: {
          include: {
            label: true
          }
        },
        members: {
          include: {
            user: true
          }
        },
        project: true
      } 
    })
    
    // Execute workflows based on changes
    if (currentTask && currentTask.projectId) {
      try {
        const workflows = await prisma.workflow.findMany({
          where: {
            projectId: currentTask.projectId,
            enabled: true
          }
        })

        for (const workflow of workflows) {
          let shouldTrigger = false
          
          // Parse trigger JSON from new format
          let trigger: any = { conditions: [], logic: 'AND' }
          try {
            trigger = JSON.parse(workflow.triggersJson || '{"conditions":[],"logic":"AND"}')
          } catch {
            // Fallback to empty trigger
          }

          // Check if any condition matches
          const results = trigger.conditions?.map((condition: any) => {
            switch (condition.type) {
              case 'status_changed':
                return updates.status && condition.value === updates.status
              case 'priority_changed':
                return updates.priority !== undefined && condition.value === updates.priority
              case 'assigned':
                return updates.assigneeId && condition.value === updates.assigneeId
              case 'due_date_set':
                return !!updates.dueDate
              case 'labeled':
                return Array.isArray(updates.labelIds) && updates.labelIds.includes(condition.value)
              default:
                return false
            }
          }) || []

          // Combine results based on logic
          if (trigger.logic === 'OR') {
            shouldTrigger = results.some((r: boolean) => r)
          } else {
            // Default to AND
            shouldTrigger = results.length > 0 && results.every((r: boolean) => r)
          }

          if (shouldTrigger) {
            try {
              // Execute actions
              const actions = JSON.parse(workflow.actionsJson)
              const executedActions: string[] = []

              for (const action of actions) {
                if (action.type === 'notify' && currentUser) {
                  // Create notification
                  await prisma.notification.create({
                    data: {
                      userId: currentUser.id,
                      type: 'task_updated',
                      title: `Workflow: ${workflow.name}`,
                      message: `Workflow triggered for task: ${task.title}`,
                      link: `/projects/${currentTask.projectId}`
                    }
                  })
                  executedActions.push('notify')
                } else if (action.type === 'assign' && action.value) {
                  // Assign task
                  await prisma.task.update({
                    where: { id: String(id) },
                    data: { assigneeId: action.value }
                  })
                  executedActions.push(`assign:${action.value}`)
                } else if (action.type === 'change_status' && action.value) {
                  // Change status
                  await prisma.task.update({
                    where: { id: String(id) },
                    data: { status: action.value }
                  })
                  executedActions.push(`change_status:${action.value}`)
                } else if (action.type === 'add_label' && action.value) {
                  // Add label
                  await prisma.taskLabel.create({
                    data: {
                      taskId: String(id),
                      labelId: action.value
                    }
                  }).catch(() => {}) // Ignore if already exists
                  executedActions.push(`add_label:${action.value}`)
                } else if (action.type === 'remove_label' && action.value) {
                  // Remove label
                  await prisma.taskLabel.deleteMany({
                    where: {
                      taskId: String(id),
                      labelId: action.value
                    }
                  })
                  executedActions.push(`remove_label:${action.value}`)
                }
              }

              // Create workflow execution record
              await prisma.workflowExecution.create({
                data: {
                  workflowId: workflow.id,
                  taskId: String(id),
                  status: 'success',
                  executedAt: new Date(),
                  resultsJson: JSON.stringify({ triggered: true, actions: executedActions })
                }
              })

              console.log(`[Workflow] Executed: ${workflow.name} for task ${id}`, executedActions)
            } catch (actionError) {
              console.error(`[Workflow] Action execution error for ${workflow.name}:`, actionError)
              // Create failed execution record
              await prisma.workflowExecution.create({
                data: {
                  workflowId: workflow.id,
                  taskId: String(id),
                  status: 'failed',
                  triggeredAt: new Date(),
                  errorMessage: actionError instanceof Error ? actionError.message : 'Unknown error'
                }
              })
            }
          }
        }
      } catch (error) {
        console.error('[Workflow] Execution error:', error)
        // Don't fail the API request on workflow errors
      }
    }
    
    // Re-fetch task if workflows modified it
    let finalTask = task
    if (currentTask && currentTask.projectId) {
      try {
        const workflows = await prisma.workflow.findMany({
          where: {
            projectId: currentTask.projectId,
            enabled: true
          }
        })
        
        // Check if any workflow might have modified the task
        let workflowModified = false
        for (const workflow of workflows) {
          let shouldTrigger = false
          
          // Parse trigger JSON from new format
          let trigger: any = { conditions: [], logic: 'AND' }
          try {
            trigger = JSON.parse(workflow.triggersJson || '{"conditions":[],"logic":"AND"}')
          } catch {
            // Fallback to empty trigger
          }

          // Check if any condition matches
          const results = trigger.conditions?.map((condition: any) => {
            switch (condition.type) {
              case 'status_changed':
                return updates.status && condition.value === updates.status
              case 'priority_changed':
                return updates.priority !== undefined && condition.value === updates.priority
              case 'assigned':
                return updates.assigneeId && condition.value === updates.assigneeId
              case 'due_date_set':
                return !!updates.dueDate
              case 'labeled':
                return Array.isArray(updates.labelIds) && updates.labelIds.includes(condition.value)
              default:
                return false
            }
          }) || []

          // Combine results based on logic
          if (trigger.logic === 'OR') {
            shouldTrigger = results.some((r: boolean) => r)
          } else {
            // Default to AND
            shouldTrigger = results.length > 0 && results.every((r: boolean) => r)
          }
          
          if (shouldTrigger) {
            workflowModified = true
            break
          }
        }
        
        if (workflowModified) {
          finalTask = await prisma.task.findUnique({
            where: { id: String(id) },
            include: { 
              labels: {
                include: {
                  label: true
                }
              },
              members: {
                include: {
                  user: true
                }
              },
              project: true
            }
          }) || task
        }
      } catch (error) {
        console.error('[Workflow] Re-fetch error:', error)
        // Use the original task if re-fetch fails
      }
    }
    
    // Log activities
    if (currentUser && currentTask) {
      // Log title change
      if (updates.title && updates.title !== currentTask.title) {
        await logActivity({
          taskId: String(id),
          userId: currentUser.id,
          action: 'updated',
          field: 'title',
          oldValue: currentTask.title,
          newValue: updates.title
        })
      }
      
      // Log description change
      if (updates.description !== undefined && updates.description !== currentTask.description) {
        await logActivity({
          taskId: String(id),
          userId: currentUser.id,
          action: 'updated',
          field: 'description',
          oldValue: currentTask.description || '',
          newValue: updates.description
        })
      }
      
      // Log status change (moved)
      if (updates.status && updates.status !== currentTask.status) {
        await logActivity({
          taskId: String(id),
          userId: currentUser.id,
          action: 'moved',
          oldValue: currentTask.status,
          newValue: updates.status
        })
      }
      
      // Log priority change
      if (updates.priority !== undefined && updates.priority !== currentTask.priority) {
        await logActivity({
          taskId: String(id),
          userId: currentUser.id,
          action: 'priority_changed',
          oldValue: currentTask.priority || 'none',
          newValue: updates.priority
        })
      }
      
      // Log assignee change
      if (updates.assigneeId && updates.assigneeId !== currentTask.assigneeId) {
        const assignee = await prisma.user.findUnique({ where: { id: updates.assigneeId } })
        await logActivity({
          taskId: String(id),
          userId: currentUser.id,
          action: 'assigned',
          newValue: assignee?.name || assignee?.email || updates.assigneeId
        })
      }
      
      // Log due date change
      if (updates.dueDate && updates.dueDate !== currentTask.dueDate?.toISOString()) {
        await logActivity({
          taskId: String(id),
          userId: currentUser.id,
          action: 'due_date_set',
          newValue: updates.dueDate
        })
      }
    }
    
    return res.status(200).json(finalTask)
  }

  if (req.method === 'DELETE') {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })
    
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    
    // Get task details for logging
    const task = await prisma.task.findUnique({ 
      where: { id: String(id) },
      select: { title: true, status: true }
    })
    
    // Log the deletion
    await prisma.activity.create({
      data: {
        taskId: String(id),
        userId: user?.id,
        action: 'deleted',
        oldValue: task?.title,
        createdAt: new Date()
      }
    })
    
    // Soft delete instead of hard delete
    await prisma.task.update({ 
      where: { id: String(id) },
      data: {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: user?.id
      }
    })
    
    return res.status(204).end()
  }

  res.setHeader('Allow', ['PATCH', 'DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
