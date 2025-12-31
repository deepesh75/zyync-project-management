import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../lib/prisma'

// Endpoint to track PayPal webhook events
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Check if user is admin
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
  if (!adminEmails.includes(session.user.email)) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  try {
    if (req.method === 'GET') {
      const { limit = '50', eventType, organizationId } = req.query

      // For now, return webhook activity from Activity table
      // In production, you'd create a dedicated WebhookLog table
      
      const activities = await prisma.activity.findMany({
        where: {
          action: { in: ['webhook_received', 'billing_updated', 'seats_updated'] },
          ...(organizationId && typeof organizationId === 'string' ? {
            task: {
              project: {
                organizationId
              }
            }
          } : {})
        },
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  organizationId: true
                }
              }
            }
          }
        }
      })

      // Return a placeholder response for now
      // In production, you'd query a WebhookLog table
      return res.status(200).json({
        logs: [],
        message: 'Webhook logging not yet implemented. Add a WebhookLog table to track events.',
        suggestion: 'Add webhook event logging in /api/webhooks/paypal to track all events'
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Webhook logs error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
