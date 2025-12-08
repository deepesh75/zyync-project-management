import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { getCached, setCached, invalidateCacheKeys, invalidateCache } from '../../../lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'invalid id' })

  if (req.method === 'GET') {
    const cacheKey = `project:${id}`
    
    // Try to get from cache
    const cached = await getCached(cacheKey)
    if (cached) {
      return res.status(200).json(cached)
    }
    
    const project = await prisma.project.findUnique({
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
    if (!project) return res.status(404).json({ error: 'Not found' })
    
    // Cache for 60 seconds
    await setCached(cacheKey, project, 60)
    return res.status(200).json(project)
  }

  if (req.method === 'PATCH') {
    try {
      const session = await getServerSession(req, res, authOptions)
      if (!session || !session.user?.email) {
        console.log('PATCH /api/projects/[id]: No session found')
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      console.log('PATCH /api/projects/[id]: Session user:', session.user.email)
      console.log('PATCH /api/projects/[id]: Request body:', req.body)
      
      const updates = req.body
      const allowed: any = {}
      if (updates.name) allowed.name = updates.name
      if (updates.columns !== undefined) allowed.columns = updates.columns
      if (updates.archived !== undefined) {
        allowed.archived = updates.archived
        allowed.archivedAt = updates.archived ? new Date() : null
      }

      console.log('PATCH /api/projects/[id]: Allowed updates:', allowed)

      const project = await prisma.project.update({
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
      
      console.log('PATCH /api/projects/[id]: Project updated successfully')
      return res.status(200).json(project)
    } catch (err) {
      console.error('PATCH /api/projects/[id]: Error:', err)
      return res.status(500).json({ error: 'Internal server error', details: String(err) })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const session = await getServerSession(req, res, authOptions)
      if (!session || !session.user?.email) {
        return res.status(401).json({ error: 'Unauthorized' })
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
