import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid project ID' })
  }

  // Verify user has access to this project
  const project = await prisma.project.findFirst({
    where: {
      id,
      OR: [
        { ownerId: (await prisma.user.findUnique({ where: { email: session.user.email } }))?.id },
        { organization: { members: { some: { user: { email: session.user.email } } } } }
      ]
    }
  })

  if (!project) {
    return res.status(403).json({ error: 'Access denied' })
  }

  if (req.method === 'GET') {
    try {
      const workflows = await prisma.workflow.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' }
      })

      // Parse actionsJson for each workflow
      const parsedWorkflows = workflows.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        enabled: w.enabled,
        trigger: {
          type: w.triggerType,
          value: w.triggerValue
        },
        actions: JSON.parse(w.actionsJson),
        createdAt: w.createdAt.getTime()
      }))

      return res.status(200).json(parsedWorkflows)
    } catch (error) {
      console.error('Error fetching workflows:', error)
      return res.status(500).json({ error: 'Failed to fetch workflows' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, enabled, trigger, actions } = req.body

      if (!name || !trigger || !Array.isArray(actions)) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const workflow = await prisma.workflow.create({
        data: {
          projectId: id,
          name,
          description: description || null,
          enabled: enabled !== false,
          triggerType: trigger.type,
          triggerValue: trigger.value || null,
          actionsJson: JSON.stringify(actions)
        }
      })

      return res.status(201).json({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        enabled: workflow.enabled,
        trigger: {
          type: workflow.triggerType,
          value: workflow.triggerValue
        },
        actions: JSON.parse(workflow.actionsJson),
        createdAt: workflow.createdAt.getTime()
      })
    } catch (error) {
      console.error('Error creating workflow:', error)
      return res.status(500).json({ error: 'Failed to create workflow' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
