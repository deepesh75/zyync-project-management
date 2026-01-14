import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid organization ID' })
  }

  try {
    // Check if user is admin of this organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: user.id
        }
      }
    })

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Fetch all organization data
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
              }
            }
          }
        },
        projects: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            tasks: {
              where: { deleted: false },
              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                },
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true
                      }
                    }
                  }
                },
                comments: {
                  include: {
                    author: {
                      select: {
                        id: true,
                        name: true,
                        email: true
                      }
                    }
                  }
                },
                subtasks: true,
                attachments: true,
                activities: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true
                      }
                    }
                  }
                }
              }
            },
            labels: true
          }
        },
        invitations: true
      }
    })

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' })
    }

    // Format the export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
        planId: organization.planId,
        billingStatus: organization.billingStatus,
        billingInterval: organization.billingInterval
      },
      members: organization.members.map(m => ({
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user
      })),
      projects: organization.projects.map(p => ({
        id: p.id,
        name: p.name,
        background: p.background,
        columns: p.columns,
        archived: p.archived,
        createdAt: p.createdAt,
        owner: p.owner,
        labels: p.labels,
        tasks: p.tasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          createdAt: t.createdAt,
          assignee: t.assignee,
          members: t.members.map(m => m.user),
          comments: t.comments.map(c => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt,
            author: c.author
          })),
          subtasks: t.subtasks,
          attachments: t.attachments,
          activities: t.activities.map(a => ({
            id: a.id,
            action: a.action,
            field: a.field,
            oldValue: a.oldValue,
            newValue: a.newValue,
            createdAt: a.createdAt,
            user: a.user
          }))
        }))
      })),
      invitations: organization.invitations.map(i => ({
        email: i.email,
        role: i.role,
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
        acceptedAt: i.acceptedAt
      })),
      statistics: {
        totalMembers: organization.members.length,
        totalProjects: organization.projects.length,
        totalTasks: organization.projects.reduce((sum, p) => sum + p.tasks.length, 0),
        totalComments: organization.projects.reduce((sum, p) => 
          sum + p.tasks.reduce((taskSum, t) => taskSum + t.comments.length, 0), 0
        )
      }
    }

    return res.status(200).json(exportData)
  } catch (error) {
    console.error('Error exporting organization data:', error)
    return res.status(500).json({ error: 'Failed to export data' })
  }
}
