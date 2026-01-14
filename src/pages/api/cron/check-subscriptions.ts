import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAndSendExpirationEmails } from '../../../lib/subscription-emails'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow both POST (manual trigger) and GET (Vercel cron)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Vercel cron jobs include a special authorization header
  const isVercelCron = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`
  const isManualTrigger = req.method === 'POST' && req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`

  if (!isVercelCron && !isManualTrigger) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const result = await checkAndSendExpirationEmails()
    
    return res.status(200).json({
      success: true,
      emailsSent: result.count,
      details: result.emails
    })
  } catch (error) {
    console.error('Error in subscription email cron:', error)
    return res.status(500).json({ 
      error: 'Failed to send emails',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
