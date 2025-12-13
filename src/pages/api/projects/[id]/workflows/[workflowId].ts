import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id, workflowId } = req.query
  if (!id || Array.isArray(id) || !workflowId || Array.isArray(workflowId)) {
    return res.status(400).json({ error: 'Invalid parameters' })
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

  // Verify workflow belongs to this project
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, projectId: id }
  })

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' })
  }

  if (req.method === 'PATCH') {
    try {
      const { name, description, enabled, trigger, actions } = req.body

      const updates: any = {}
      if (name !== undefined) updates.name = name
      if (description !== undefined) updates.description = description
      if (enabled !== undefined) updates.enabled = enabled
      if (trigger) {
        updates.triggerType = trigger.type
        updates.triggerValue = trigger.value || null
      }
      if (actions) {
        updates.actionsJson = JSON.stringify(actions)
      }

      const updatedWorkflow = await prisma.workflow.update({
        where: { id: workflowId },
        data: updates
      })

      return res.status(200).json({
        id: updatedWorkflow.id,
        name: updatedWorkflow.name,
        description: updatedWorkflow.description,
        enabled: updatedWorkflow.enabled,
        trigger: {
          type: updatedWorkflow.triggerType,
          value: updatedWorkflow.triggerValue
        },
        actions: JSON.parse(updatedWorkflow.actionsJson),
        createdAt: updatedWorkflow.createdAt.getTime()
      })
    } catch (error) {
      console.error('Error updating workflow:', error)
      return res.status(500).json({ error: 'Failed to update workflow' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.workflow.delete({
        where: { id: workflowId }
      })

      return res.status(204).end()
    } catch (error) {
      console.error('Error deleting workflow:', error)
      return res.status(500).json({ error: 'Failed to delete workflow' })
    }
  }

  res.setHeader('Allow', ['PATCH', 'DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
