import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, workflowId } = req.query
  if (!id || Array.isArray(id) || !workflowId || Array.isArray(workflowId)) {
    return res.status(400).json({ error: 'Invalid IDs' })
  }

  // Check auth
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  // Check project access
  const project = await prisma.project.findUnique({ where: { id: String(id) } })
  if (!project) return res.status(404).json({ error: 'Project not found' })

  let hasAccess = false
  if (project.ownerId === user.id) {
    hasAccess = true
  } else if (project.organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: project.organizationId, userId: user.id } }
    })
    hasAccess = !!membership
  }

  if (!hasAccess) return res.status(403).json({ error: 'No access' })

  // Get workflow
  const workflow = await prisma.workflow.findUnique({
    where: { id: String(workflowId) },
    include: { executions: true }
  })

  if (!workflow) return res.status(404).json({ error: 'Workflow not found' })

  if (req.method === 'POST') {
    const { taskId } = req.body
    if (!taskId) return res.status(400).json({ error: 'taskId required' })

    try {
      // Get task for context
      const task = await prisma.task.findUnique({
        where: { id: String(taskId) },
        include: { labels: true, members: true }
      })
      if (!task) return res.status(404).json({ error: 'Task not found' })

      // Create execution record
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: String(workflowId),
          taskId: String(taskId),
          status: 'executing'
        }
      })

      // Log workflow trigger
      await prisma.workflowLog.create({
        data: {
          workflowId: String(workflowId),
          taskId: String(taskId),
          executionId: execution.id,
          action: 'triggered',
          message: `Workflow manually executed for task: ${task.title}`
        }
      })

      // Parse and execute actions
      const actions = JSON.parse(workflow.actionsJson || '[]')
      const results: any[] = []

      for (const action of actions) {
        try {
          let actionResult: any = null

          if (action.type === 'notify') {
            await prisma.notification.create({
              data: {
                userId: user.id,
                type: 'task_updated',
                title: `Workflow: ${workflow.name}`,
                message: `Workflow executed for task: ${task.title}`,
                link: `/projects/${project.id}?task=${task.id}`
              }
            })
            actionResult = { type: 'notification', success: true }
          } else if (action.type === 'notify_email') {
            // Email notifications (implementation depends on email service)
            actionResult = { type: 'email', recipient: action.metadata?.to, queued: true }
          } else if (action.type === 'assign' && action.value) {
            await prisma.task.update({
              where: { id: String(taskId) },
              data: { assigneeId: action.value }
            })
            actionResult = { type: 'assignment', userId: action.value }
          } else if (action.type === 'change_status' && action.value) {
            await prisma.task.update({
              where: { id: String(taskId) },
              data: { status: action.value }
            })
            actionResult = { type: 'status', newStatus: action.value }
          } else if (action.type === 'add_label' && action.value) {
            await prisma.taskLabel.create({
              data: { taskId: String(taskId), labelId: action.value }
            })
            actionResult = { type: 'label_added', labelId: action.value }
          } else if (action.type === 'remove_label' && action.value) {
            await prisma.taskLabel.deleteMany({
              where: { taskId: String(taskId), labelId: action.value }
            })
            actionResult = { type: 'label_removed', labelId: action.value }
          } else if (action.type === 'set_priority' && action.value) {
            await prisma.task.update({
              where: { id: String(taskId) },
              data: { priority: action.value }
            })
            actionResult = { type: 'priority', newPriority: action.value }
          } else if (action.type === 'set_due_date' && action.metadata?.dueDate) {
            await prisma.task.update({
              where: { id: String(taskId) },
              data: { dueDate: new Date(action.metadata.dueDate) }
            })
            actionResult = { type: 'due_date', newDate: action.metadata.dueDate }
          } else if (action.type === 'add_member' && action.value) {
            await prisma.taskMember.create({
              data: { taskId: String(taskId), userId: action.value }
            })
            actionResult = { type: 'member_added', userId: action.value }
          } else if (action.type === 'create_task' && action.metadata?.taskName) {
            const newTask = await prisma.task.create({
              data: {
                title: action.metadata.taskName,
                description: action.metadata?.description,
                projectId: project.id,
                status: 'todo',
                priority: action.metadata?.priority || 'medium'
              }
            })
            actionResult = { type: 'task_created', taskId: newTask.id, taskName: newTask.title }
          } else if (action.type === 'send_webhook' && action.metadata?.url) {
            // Send webhook (non-blocking)
            fetch(action.metadata.url, {
              method: action.metadata?.method || 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workflow: { id: workflow.id, name: workflow.name },
                task: { id: task.id, title: task.title },
                action: action.metadata?.payload || {}
              })
            }).catch(err => console.error('Webhook failed:', err))
            actionResult = { type: 'webhook_sent', url: action.metadata.url }
          }

          if (actionResult) {
            results.push(actionResult)
            await prisma.workflowLog.create({
              data: {
                workflowId: String(workflowId),
                taskId: String(taskId),
                executionId: execution.id,
                action: 'executed',
                actionType: action.type,
                message: `Executed action: ${action.type}`,
                resultJson: JSON.stringify(actionResult)
              }
            })
          }
        } catch (actionErr: any) {
          console.error('Action execution error:', actionErr)
          await prisma.workflowLog.create({
            data: {
              workflowId: String(workflowId),
              taskId: String(taskId),
              executionId: execution.id,
              action: 'failed',
              actionType: action.type,
              message: `Failed to execute action: ${action.type}`,
              errorMessage: actionErr.message
            }
          })
        }
      }

      // Update execution status
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'success',
          executedAt: new Date(),
          resultsJson: JSON.stringify(results)
        }
      })

      res.status(200).json({
        success: true,
        execution: execution.id,
        results,
        message: `Workflow executed with ${results.length} actions`
      })
    } catch (err: any) {
      console.error('Workflow execution error:', err)
      res.status(500).json({ error: 'Failed to execute workflow', details: err.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
