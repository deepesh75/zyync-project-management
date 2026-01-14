import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAndSendExpirationEmails } from '../../../lib/subscription-emails'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Simple secret-based authentication for cron jobs
  const authHeader = req.headers.authorization
  const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'your-secret-key-here'}`

  if (authHeader !== expectedAuth) {
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
