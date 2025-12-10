import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { invalidateCacheKeys } from '../../../../lib/redis'
import { logActivity } from '../../../../lib/activity'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query
  
  // Get the original task with all its relations
  const originalTask = await prisma.task.findUnique({
    where: { id: String(id) },
    include: {
      subtasks: true,
      labels: true
    }
  })

  if (!originalTask) {
    return res.status(404).json({ error: 'Task not found' })
  }

  // Create the duplicated task
  const duplicatedTask = await prisma.task.create({
    data: {
      title: `Copy of ${originalTask.title}`,
      description: originalTask.description,
      status: originalTask.status,
      priority: originalTask.priority,
      dueDate: originalTask.dueDate,
      projectId: originalTask.projectId,
      assigneeId: originalTask.assigneeId,
      labels: {
        connect: originalTask.labels.map(label => ({ id: label.id }))
      },
      subtasks: {
        create: originalTask.subtasks.map(subtask => ({
          title: subtask.title,
          completed: false // Reset completion status for duplicated subtasks
        }))
      }
    },
    include: {
      assignee: true,
      project: true,
      subtasks: true,
      labels: true
    }
  })

  // Log duplication activity on the original task
  await logActivity({
    taskId: originalTask.id,
    userId: user.id,
    action: 'duplicated',
    newValue: duplicatedTask.id
  })

  // Log creation activity on the new task
  await logActivity({
    taskId: duplicatedTask.id,
    userId: user.id,
    action: 'created'
  })

  // Invalidate project cache
  await invalidateCacheKeys([`project:${originalTask.projectId}`])

  return res.status(201).json(duplicatedTask)
}
