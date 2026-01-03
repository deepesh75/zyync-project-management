import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { invalidateCacheKeys } from '../../lib/redis'
import { logActivity } from '../../lib/activity'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Require authentication
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { projectId } = req.query
    
    // If projectId is specified, verify user has access to the project
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: String(projectId) }
      })
      
      if (!project) return res.status(404).json({ error: 'Project not found' })
      
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
    }

    const opts: any = { 
      where: { deleted: false },
      include: { assignee: true, project: true }, 
      orderBy: { createdAt: 'desc' } 
    }
    if (projectId) {
      opts.where = { 
        projectId: String(projectId),
        deleted: false 
      }
    }
    const tasks = await prisma.task.findMany(opts)
    return res.status(200).json(tasks)
  }

  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })
    
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    
    const { title, description, projectId, assigneeId, dueDate, status } = req.body
    if (!title || !projectId) return res.status(400).json({ error: 'title and projectId are required' })
    
    // Verify user has access to the project
    const project = await prisma.project.findUnique({
      where: { id: String(projectId) }
    })
    
    if (!project) return res.status(404).json({ error: 'Project not found' })
    
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
    
    const task = await prisma.task.create({
      data: {
        title,
        description,
        project: { connect: { id: projectId } },
        assignee: assigneeId ? { connect: { id: assigneeId } } : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: status ?? 'todo'
      }
    })
    
    // Log activity
    await logActivity({
      taskId: task.id,
      userId: user.id,
      action: 'created'
    })
    
    // Invalidate project cache since tasks are included in project data
    await invalidateCacheKeys([`project:${projectId}`])
    
    return res.status(201).json(task)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
