import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { getCached, setCached, invalidateCacheKeys } from '../../lib/redis'
import { checkOrganizationAccess } from '../../lib/access-control'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
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
            { deleted: false },
            showArchived === 'true' ? {} : { archived: false },
            {
              OR: [
                { ownerId: user.id },
                { organizationId: { in: userOrgIds } },
                { members: { some: { userId: user.id } } }
              ]
            }
          ]
        },
        include: { 
          owner: true,
          members: {
            include: { user: { select: { id: true, name: true, email: true } } }
          },
          tasks: {
            where: { deleted: false },
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
    } catch (err: any) {
      console.error('GET /api/projects error:', err)
      return res.status(500).json({ error: err?.message || 'Internal server error' })
    }
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
    
    // Invalidate projects list cache for this user (exact keys — wildcard scan is unreliable in serverless)
    await invalidateCacheKeys([
      `projects:list:${user!.id}:false`,
      `projects:list:${user!.id}:true`,
      `projects:list:${user!.id}:active`,
    ])
    
    return res.status(201).json(project)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
