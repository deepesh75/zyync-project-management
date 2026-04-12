import type { NextApiRequest, NextApiResponse } from 'next'
import { markExpiredOrganizationsAsRestricted } from '../../../lib/access-restriction'

/**
 * Cron job endpoint to mark expired organizations as access_restricted
 * Call this periodically (e.g., every hour) to enforce access restrictions
 *
 * Usage: GET /api/cron/check-expired-subscriptions?key=YOUR_SECRET_KEY
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET
  const providedKey = req.query.key as string

  if (!cronSecret || cronSecret !== providedKey) {
    return res.status(401).json({ error: 'Invalid cron secret' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const result = await markExpiredOrganizationsAsRestricted()

    console.log('Cron job completed:', {
      timestamp: new Date().toISOString(),
      organizationsRestricted: result.restricted,
      notificationsSent: result.notified
    })

    return res.status(200).json({
      success: true,
      message: `Marked ${result.restricted} organizations as access_restricted`,
      organizationsRestricted: result.restricted,
      notificationsSent: result.notified,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cron job failed:', error)
    return res.status(500).json({
      error: 'Failed to check expired subscriptions',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
