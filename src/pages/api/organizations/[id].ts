import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { getCached, setCached, invalidateCacheKeys, invalidateCache } from '../../../lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid ID' })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) return res.status(404).json({ error: 'User not found' })

  // Check if user is member of this organization
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: id,
        userId: user.id
      }
    }
  })

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this organization' })
  }

  if (req.method === 'GET') {
    const cacheKey = `organization:${id}`
    
    // Try to get from cache
    const cached = await getCached(cacheKey)
    if (cached) {
      return res.status(200).json(cached)
    }
    
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        },
        projects: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        },
        invitations: {
          where: {
            acceptedAt: null,
            expiresAt: {
              gt: new Date()
            }
          }
        }
      }
    })

    if (!organization) return res.status(404).json({ error: 'Organization not found' })
    
    // Cache for 60 seconds
    await setCached(cacheKey, organization, 60)

    return res.status(200).json(organization)
  }

  if (req.method === 'PATCH') {
    // Only admins can update organization
    if (membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update organization' })
    }

    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })

    const organization = await prisma.organization.update({
      where: { id },
      data: { name }
    })
    
    // Invalidate cache for this organization and user's org list
    await invalidateCacheKeys([`organization:${id}`])
    await invalidateCache(`organizations:user:*`)

    return res.status(200).json(organization)
  }

  if (req.method === 'DELETE') {
    // Only admins can delete organization
    if (membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete organization' })
    }

    await prisma.organization.delete({
      where: { id }
    })
    
    // Invalidate cache for this organization and user's org list
    await invalidateCacheKeys([`organization:${id}`])
    await invalidateCache(`organizations:user:*`)

    return res.status(200).json({ success: true })
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
