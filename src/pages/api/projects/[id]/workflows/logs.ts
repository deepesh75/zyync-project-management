import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid project ID' })
  }

  // Check auth
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  // Check project access
  const project = await prisma.project.findUnique({ where: { id: String(id) } })
  if (!project) return res.status(404).json({ error: 'Project not found' })

  let hasAccess = false
  if (project.ownerId === user.id) {
    hasAccess = true
  } else if (project.organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: project.organizationId, userId: user.id } }
    })
    hasAccess = !!membership
  }

  if (!hasAccess) return res.status(403).json({ error: 'No access' })

  if (req.method === 'GET') {
    try {
      // Get query parameters for filtering
      const { workflowId, limit = '50', offset = '0' } = req.query
      const take = Math.min(parseInt(String(limit)), 100)
      const skip = parseInt(String(offset))

      // Build where clause
      const where: any = { workflow: { projectId: String(id) } }
      if (workflowId) {
        where.workflowId = String(workflowId)
      }

      // Fetch logs with related data
      const logs = await prisma.workflowLog.findMany({
        where,
        include: {
          workflow: true,
          execution: true
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip
      })

      // Get total count
      const total = await prisma.workflowLog.count({ where })

      res.status(200).json({
        logs,
        pagination: { limit: take, offset: skip, total }
      })
    } catch (err: any) {
      console.error('Error fetching workflow logs:', err)
      res.status(500).json({ error: 'Failed to fetch logs' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
