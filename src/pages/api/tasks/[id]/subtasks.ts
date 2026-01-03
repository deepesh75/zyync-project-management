import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query // task ID

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid task ID' })
  }

  if (req.method === 'GET') {
    // Get all subtasks for a task
    try {
      const subtasks = await prisma.subtask.findMany({
        where: { 
          taskId: String(id),
          deleted: false 
        },
        orderBy: { order: 'asc' }
      })
      return res.status(200).json(subtasks)
    } catch (error) {
      console.error('Error fetching subtasks:', error)
      return res.status(500).json({ error: 'Failed to fetch subtasks' })
    }
  }

  if (req.method === 'POST') {
    // Create a new subtask
    const { title } = req.body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Subtask title is required' })
    }

    try {
      // Get the current max order
      const maxOrderSubtask = await prisma.subtask.findFirst({
        where: { taskId: String(id) },
        orderBy: { order: 'desc' }
      })

      const newOrder = maxOrderSubtask ? maxOrderSubtask.order + 1 : 0

      const subtask = await prisma.subtask.create({
        data: {
          title: title.trim(),
          taskId: String(id),
          order: newOrder
        }
      })

      return res.status(201).json(subtask)
    } catch (error) {
      console.error('Error creating subtask:', error)
      return res.status(500).json({ error: 'Failed to create subtask' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
