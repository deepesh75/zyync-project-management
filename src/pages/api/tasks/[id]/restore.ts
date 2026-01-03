import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  
  try {
    const task = await prisma.task.findUnique({
      where: { id: String(id) }
    })
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    if (!task.deleted) {
      return res.status(400).json({ error: 'Task is not deleted' })
    }
    
    // Restore the task
    const restored = await prisma.task.update({
      where: { id: String(id) },
      data: {
        deleted: false,
        deletedAt: null,
        deletedBy: null
      }
    })
    
    // Log the restoration
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    await prisma.activity.create({
      data: {
        taskId: String(id),
        userId: user?.id,
        action: 'restored',
        newValue: 'Task restored from deletion',
        createdAt: new Date()
      }
    })
    
    return res.status(200).json(restored)
  } catch (error) {
    console.error('Error restoring task:', error)
    return res.status(500).json({ error: 'Failed to restore task' })
  }
}
