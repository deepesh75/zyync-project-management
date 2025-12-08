import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { getCached, setCached, invalidateCache } from '../../../lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    // Get user's organizations
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) return res.status(404).json({ error: 'User not found' })
    
    const cacheKey = `organizations:user:${user.id}`
    
    // Try to get from cache
    const cached = await getCached(cacheKey)
    if (cached) {
      return res.status(200).json(cached)
    }
    
    const userWithOrgs = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        organizationMemberships: {
          include: {
            organization: true
          }
        }
      }
    })

    if (!userWithOrgs) return res.status(404).json({ error: 'User not found' })

    const organizations = userWithOrgs.organizationMemberships.map(m => ({
      ...m.organization,
      role: m.role
    }))
    
    // Cache for 60 seconds
    await setCached(cacheKey, organizations, 60)

    return res.status(200).json(organizations)
  }

  if (req.method === 'POST') {
    // Create new organization
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) return res.status(404).json({ error: 'User not found' })

    // Create slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    
    // Check if slug is taken
    const existing = await prisma.organization.findUnique({ where: { slug } })
    if (existing) {
      return res.status(400).json({ error: 'Organization name already taken' })
    }

    // Create organization and add creator as admin
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId: user.id,
            role: 'admin'
          }
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    })
    
    // Invalidate organizations cache for this user
    await invalidateCache(`organizations:user:${user.id}`)

    return res.status(201).json(organization)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
