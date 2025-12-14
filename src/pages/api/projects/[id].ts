import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { getCached, setCached, invalidateCacheKeys, invalidateCache } from '../../../lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'invalid id' })

  // Get the current user's session for all methods
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })
  if (!user) return res.status(404).json({ error: 'User not found' })

  // Check if user has access to this project
  const project = await prisma.project.findUnique({
    where: { id: String(id) }
  })
  
  if (!project) return res.status(404).json({ error: 'Not found' })

  // Check authorization: user must own the project or be in the organization
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
    return res.status(403).json({ error: 'You do not have access to this project' })
  }

  if (req.method === 'GET') {
    const cacheKey = `project:${id}`
    
    // Try to get from cache
    const cached = await getCached(cacheKey)
    if (cached) {
      return res.status(200).json(cached)
    }
    
    const fullProject = await prisma.project.findUnique({
      where: { id: String(id) },
      include: {
        owner: true,
        labels: true,
        tasks: { 
          include: { 
            labels: {
              include: {
                label: true
              }
            },
            members: {
              include: {
                user: true
              }
            },
            subtasks: {
              orderBy: {
                order: 'asc'
              }
            }
          } 
        }
      }
    })
    if (!fullProject) return res.status(404).json({ error: 'Not found' })
    
    // Cache for 60 seconds
    await setCached(cacheKey, fullProject, 60)
    return res.status(200).json(fullProject)
  }

  if (req.method === 'PATCH') {
    try {
      // Only project owner can modify
      if (project.ownerId !== user.id) {
        return res.status(403).json({ error: 'Only the project owner can modify this project' })
      }
      
      const updates = req.body
      const allowed: any = {}
      if (updates.name) allowed.name = updates.name
      if (updates.columns !== undefined) allowed.columns = updates.columns
      if (updates.background !== undefined) allowed.background = updates.background
      if (updates.archived !== undefined) {
        allowed.archived = updates.archived
        allowed.archivedAt = updates.archived ? new Date() : null
      }

      const updatedProject = await prisma.project.update({
        where: { id: String(id) },
        data: allowed,
        include: {
          owner: true,
          labels: true,
          tasks: { 
            include: { 
              labels: {
                include: {
                  label: true
                }
              },
              members: {
                include: {
                  user: true
                }
              },
              subtasks: {
                orderBy: {
                  order: 'asc'
                }
              }
            } 
          }
        }
      })
      
      // Invalidate cache for this project and projects list
      await invalidateCacheKeys([`project:${id}`])
      await invalidateCache('projects:list:*')
      
      return res.status(200).json(updatedProject)
    } catch (err) {
      console.error('PATCH /api/projects/[id]: Error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Only project owner can delete
      if (project.ownerId !== user.id) {
        return res.status(403).json({ error: 'Only the project owner can delete this project' })
      }

      // Delete the project (this will cascade delete tasks, labels, etc.)
      await prisma.project.delete({
        where: { id: String(id) }
      })

      // Invalidate cache for this project and projects list
      await invalidateCacheKeys([`project:${id}`])
      await invalidateCache('projects:list:*')

      return res.status(200).json({ message: 'Project deleted successfully' })
    } catch (err) {
      console.error('DELETE /api/projects/[id]: Error:', err)
      return res.status(500).json({ error: 'Failed to delete project' })
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
