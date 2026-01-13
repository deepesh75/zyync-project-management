import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { getCached, setCached, invalidateCache } from '../../lib/redis'
import { checkOrganizationAccess } from '../../lib/access-control'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Require authentication
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { showArchived } = req.query
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user) return res.status(404).json({ error: 'User not found' })

    // Get projects owned by user or where user is in organization
    const userOrgIds = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true }
    }).then(mems => mems.map(m => m.organizationId))

    const cacheKey = `projects:list:${user.id}:${showArchived || 'active'}`
    
    // Try to get from cache
    const cached = await getCached(cacheKey)
    if (cached) {
      return res.status(200).json(cached)
    }
    
    const projects = await prisma.project.findMany({ 
      where: {
        AND: [
          { deleted: false }, // Exclude soft-deleted projects
          showArchived === 'true' ? {} : { archived: false },
          {
            OR: [
              { ownerId: user.id }, // User owns the project
              { organizationId: { in: userOrgIds } } // User is in the organization
            ]
          }
        ]
      },
      include: { 
        owner: true, 
        tasks: {
          where: { deleted: false }, // Exclude soft-deleted tasks
          include: {
            members: {
              include: {
                user: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // Cache for 30 seconds
    await setCached(cacheKey, projects, 30)
    return res.status(200).json(projects)
  }

  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    const { name, organizationId } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    
    // If organizationId provided, verify user is a member
    if (organizationId) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: user!.id
          }
        }
      })
      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this organization' })
      }

      // Check if organization has active subscription
      const accessCheck = await checkOrganizationAccess(organizationId)
      if (!accessCheck.allowed) {
        return res.status(403).json({ 
          error: accessCheck.message || 'Subscription required',
          reason: accessCheck.reason,
          upgradeRequired: true
        })
      }
    }
    
    const project = await prisma.project.create({ 
      data: { 
        name, 
        ownerId: user?.id,
        organizationId: organizationId || null
      } 
    })
    
    // Invalidate projects list cache
    await invalidateCache('projects:list:*')
    
    return res.status(201).json(project)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
