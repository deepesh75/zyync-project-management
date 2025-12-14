import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  const session = await getServerSession(req, res, authOptions)
  
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // GET - Get all templates for a project
  if (req.method === 'GET') {
    try {
      const templates = await prisma.taskTemplate.findMany({
        where: {
          projectId: String(id)
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Parse JSON fields for response
      const parsedTemplates = templates.map(template => ({
        ...template,
        labelIds: template.labelIds ? JSON.parse(template.labelIds) : [],
        defaultMembers: template.defaultMembers ? JSON.parse(template.defaultMembers) : [],
        customFields: template.customFields ? JSON.parse(template.customFields) : {}
      }))

      return res.status(200).json(parsedTemplates)
    } catch (error) {
      console.error('Error fetching templates:', error)
      return res.status(500).json({ error: 'Failed to fetch templates' })
    }
  }

  // POST - Create a new template
  if (req.method === 'POST') {
    try {
      const { name, description, priority, coverColor, labelIds, defaultAssigneeId, defaultMembers, dueOffsetDays, customFields } = req.body

      if (!name) {
        return res.status(400).json({ error: 'Template name is required' })
      }

      const template = await prisma.taskTemplate.create({
        data: {
          projectId: String(id),
          name,
          description: description || null,
          priority: priority || 'medium',
          coverColor: coverColor || null,
          labelIds: labelIds ? JSON.stringify(labelIds) : null,
          defaultAssigneeId: defaultAssigneeId || null,
          defaultMembers: defaultMembers ? JSON.stringify(defaultMembers) : null,
          dueOffsetDays: dueOffsetDays || null,
          customFields: customFields ? JSON.stringify(customFields) : null
        }
      })

      // Parse JSON fields for response
      const parsed = {
        ...template,
        labelIds: template.labelIds ? JSON.parse(template.labelIds) : [],
        defaultMembers: template.defaultMembers ? JSON.parse(template.defaultMembers) : [],
        customFields: template.customFields ? JSON.parse(template.customFields) : {}
      }

      return res.status(201).json(parsed)
    } catch (error) {
      console.error('Error creating template:', error)
      return res.status(500).json({ error: 'Failed to create template' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
