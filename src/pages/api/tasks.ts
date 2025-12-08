import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { invalidateCacheKeys } from '../../lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { projectId } = req.query
    const opts: any = { include: { assignee: true, project: true }, orderBy: { createdAt: 'desc' } }
    if (projectId) opts.where = { projectId: String(projectId) }
    const tasks = await prisma.task.findMany(opts)
    return res.status(200).json(tasks)
  }

  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })
    const { title, description, projectId, assigneeId, dueDate, status } = req.body
    if (!title || !projectId) return res.status(400).json({ error: 'title and projectId are required' })
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
    
    // Invalidate project cache since tasks are included in project data
    await invalidateCacheKeys([`project:${projectId}`])
    
    return res.status(201).json(task)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
