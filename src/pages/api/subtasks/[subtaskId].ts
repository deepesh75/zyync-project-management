import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { subtaskId } = req.query

  if (!subtaskId || Array.isArray(subtaskId)) {
    return res.status(400).json({ error: 'Invalid subtask ID' })
  }

  if (req.method === 'PATCH') {
    // Update subtask (toggle completed or change title)
    const { completed, title } = req.body

    try {
      const data: any = {}
      if (typeof completed === 'boolean') {
        data.completed = completed
      }
      if (title && typeof title === 'string') {
        data.title = title.trim()
      }

      const subtask = await prisma.subtask.update({
        where: { id: String(subtaskId) },
        data
      })

      return res.status(200).json(subtask)
    } catch (error) {
      console.error('Error updating subtask:', error)
      return res.status(500).json({ error: 'Failed to update subtask' })
    }
  }

  if (req.method === 'DELETE') {
    // Delete subtask
    try {
      await prisma.subtask.delete({
        where: { id: String(subtaskId) }
      })

      return res.status(200).json({ message: 'Subtask deleted' })
    } catch (error) {
      console.error('Error deleting subtask:', error)
      return res.status(500).json({ error: 'Failed to delete subtask' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
