import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { showArchived } = req.query
    
    const projects = await prisma.project.findMany({ 
      where: showArchived === 'true' ? {} : { archived: false },
      include: { 
        owner: true, 
        tasks: {
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
    }
    
    const project = await prisma.project.create({ 
      data: { 
        name, 
        ownerId: user?.id,
        organizationId: organizationId || null
      } 
    })
    return res.status(201).json(project)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
