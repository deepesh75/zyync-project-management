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
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    
    const project = await prisma.project.findUnique({
      where: { id: String(id) }
    })
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }
    
    // Check if user is the owner
    if (project.ownerId !== user?.id) {
      return res.status(403).json({ error: 'Only the project owner can restore this project' })
    }
    
    if (!project.deleted) {
      return res.status(400).json({ error: 'Project is not deleted' })
    }
    
    // Restore the project
    const restored = await prisma.project.update({
      where: { id: String(id) },
      data: {
        deleted: false,
        deletedAt: null,
        deletedBy: null
      }
    })
    
    // Also restore all tasks that were deleted with the project
    await prisma.task.updateMany({
      where: { 
        projectId: String(id),
        deletedBy: user?.id,
        deletedAt: project.deletedAt
      },
      data: {
        deleted: false,
        deletedAt: null,
        deletedBy: null
      }
    })
    
    return res.status(200).json(restored)
  } catch (error) {
    console.error('Error restoring project:', error)
    return res.status(500).json({ error: 'Failed to restore project' })
  }
}
