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

      // Parse workflows from triggersJson format
      const parsedWorkflows = workflows.map(w => {
        let trigger: any
        
        try {
          trigger = JSON.parse(w.triggersJson || '{"conditions":[],"logic":"AND"}')
        } catch {
          // Fallback to empty trigger
          trigger = { conditions: [], logic: 'AND' }
        }

        return {
          id: w.id,
          name: w.name,
          description: w.description,
          enabled: w.enabled,
          trigger,
          actions: JSON.parse(w.actionsJson || '[]'),
          delaySeconds: w.delaySeconds || 0,
          createdAt: w.createdAt.getTime()
        }
      })

      return res.status(200).json(parsedWorkflows)
    } catch (error) {
      console.error('Error fetching workflows:', error)
      return res.status(500).json({ error: 'Failed to fetch workflows' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, enabled, trigger, actions, delaySeconds } = req.body

      if (!name || !trigger || !Array.isArray(actions)) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      // Support both old and new trigger formats
      let triggersJson: string

      if (trigger.conditions && Array.isArray(trigger.conditions)) {
        // New format
        triggersJson = JSON.stringify(trigger)
      } else if (trigger.type) {
        // Old format - convert to new
        triggersJson = JSON.stringify({
          conditions: [{
            type: trigger.type,
            value: trigger.value
          }],
          logic: 'AND'
        })
      } else {
        return res.status(400).json({ error: 'Invalid trigger format' })
      }

      const workflow = await prisma.workflow.create({
        data: {
          projectId: id,
          name,
          description: description || null,
          enabled: enabled !== false,
          triggersJson,
          actionsJson: JSON.stringify(actions),
          delaySeconds: delaySeconds || 0
        }
      })

      // Parse and return
      const trigger_response = JSON.parse(workflow.triggersJson || '{}')
      return res.status(201).json({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        enabled: workflow.enabled,
        trigger: trigger_response,
        actions: JSON.parse(workflow.actionsJson),
        delaySeconds: workflow.delaySeconds,
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
