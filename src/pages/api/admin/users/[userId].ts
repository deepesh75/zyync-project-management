import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../lib/prisma'

// Admin-only endpoint for deleting users
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Check if user is admin
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
  if (!adminEmails.includes(session.user.email)) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const { userId } = req.query

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID required' })
  }

  try {
    if (req.method === 'DELETE') {
      // Get user info before deletion
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              organizationMemberships: true,
              projects: true,
              assignedTasks: true
            }
          }
        }
      })

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      // Prevent deleting admin users
      if (adminEmails.includes(user.email)) {
        return res.status(403).json({ error: 'Cannot delete admin users' })
      }

      // Delete user (cascade will handle related records)
      await prisma.user.delete({
        where: { id: userId }
      })

      return res.status(200).json({ 
        success: true,
        message: `User ${user.email} deleted successfully`,
        deletedUser: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Delete user error:', error)
    return res.status(500).json({ error: 'Failed to delete user' })
  }
}
