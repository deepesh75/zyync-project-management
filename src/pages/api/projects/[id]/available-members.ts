import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid project ID' })

  // Get the current user's session
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })
  if (!user) return res.status(404).json({ error: 'User not found' })

  // Get the project and verify user has access
  const project = await prisma.project.findUnique({
    where: { id: String(id) }
  })

  if (!project) return res.status(404).json({ error: 'Project not found' })

  // Check authorization: user must own the project or be in the organization or be a project member
  let hasAccess = false
  if (project.ownerId === user.id) {
    hasAccess = true
  } else if (project.organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId: user.id
        }
      }
    })
    hasAccess = !!membership
  }

  if (!hasAccess) {
    const projectMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: String(id),
          userId: user.id
        }
      }
    })
    hasAccess = !!projectMember
  }

  if (!hasAccess) {
    return res.status(403).json({ error: 'You do not have access to this project' })
  }

  // If project belongs to an organization, return only that organization's members
  if (project.organizationId) {
    const orgMembers = await prisma.organizationMember.findMany({
      where: { organizationId: project.organizationId },
      select: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    const users = orgMembers.map(m => m.user)
    return res.status(200).json(users)
  }

  // If project has no organization (personal project), return no members
  // Users can only add members via project invitation, not by listing all system users
  return res.status(200).json([])
}
