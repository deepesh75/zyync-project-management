import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { notifyTaskAssignment, notifyMemberAdded } from '../../../lib/notifications'
import { logActivity } from '../../../lib/activity'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'invalid id' })

  if (req.method === 'PATCH') {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })
    
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
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
        }
      } 
    })
    
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
    
    return res.status(200).json(task)
  }

  if (req.method === 'DELETE') {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })
    await prisma.task.delete({ where: { id: String(id) } })
    return res.status(204).end()
  }

  res.setHeader('Allow', ['PATCH', 'DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
