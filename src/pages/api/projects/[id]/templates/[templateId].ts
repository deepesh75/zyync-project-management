import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '../../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, templateId } = req.query
  const session = await getServerSession(req, res, authOptions)
  
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // PATCH - Update a template
  if (req.method === 'PATCH') {
    try {
      const { name, description, priority, coverColor, labelIds, defaultAssigneeId, defaultMembers, dueOffsetDays, customFields } = req.body

      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (priority !== undefined) updateData.priority = priority
      if (coverColor !== undefined) updateData.coverColor = coverColor
      if (labelIds !== undefined) updateData.labelIds = labelIds ? JSON.stringify(labelIds) : null
      if (defaultAssigneeId !== undefined) updateData.defaultAssigneeId = defaultAssigneeId
      if (defaultMembers !== undefined) updateData.defaultMembers = defaultMembers ? JSON.stringify(defaultMembers) : null
      if (dueOffsetDays !== undefined) updateData.dueOffsetDays = dueOffsetDays
      if (customFields !== undefined) updateData.customFields = customFields ? JSON.stringify(customFields) : null

      const template = await prisma.taskTemplate.update({
        where: { id: String(templateId) },
        data: updateData
      })

      // Parse JSON fields for response
      const parsed = {
        ...template,
        labelIds: template.labelIds ? JSON.parse(template.labelIds) : [],
        defaultMembers: template.defaultMembers ? JSON.parse(template.defaultMembers) : [],
        customFields: template.customFields ? JSON.parse(template.customFields) : {}
      }

      return res.status(200).json(parsed)
    } catch (error) {
      console.error('Error updating template:', error)
      return res.status(500).json({ error: 'Failed to update template' })
    }
  }

  // DELETE - Delete a template
  if (req.method === 'DELETE') {
    try {
      await prisma.taskTemplate.delete({
        where: { id: String(templateId) }
      })

      return res.status(204).end()
    } catch (error) {
      console.error('Error deleting template:', error)
      return res.status(500).json({ error: 'Failed to delete template' })
    }
  }

  res.setHeader('Allow', ['PATCH', 'DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
