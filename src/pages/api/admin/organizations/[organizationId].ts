import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../lib/prisma'

// Admin-only endpoint for deleting organizations
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

  const { organizationId } = req.query

  if (!organizationId || typeof organizationId !== 'string') {
    return res.status(400).json({ error: 'Organization ID required' })
  }

  try {
    if (req.method === 'DELETE') {
      // Get organization info before deletion
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          _count: {
            select: {
              members: true,
              projects: true,
              invitations: true
            }
          }
        }
      })

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' })
      }

      // Delete organization (cascade will handle related records)
      await prisma.organization.delete({
        where: { id: organizationId }
      })

      return res.status(200).json({ 
        success: true,
        message: `Organization "${organization.name}" deleted successfully`,
        deletedOrganization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          memberCount: organization._count.members,
          projectCount: organization._count.projects
        }
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Delete organization error:', error)
    return res.status(500).json({ error: 'Failed to delete organization' })
  }
}
