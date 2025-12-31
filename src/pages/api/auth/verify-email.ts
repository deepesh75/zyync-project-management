import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyEmailToken } from '../../../lib/email-verification'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token } = req.body

  if (!token) {
    return res.status(400).json({ error: 'Verification token required' })
  }

  const result = await verifyEmailToken(token)

  if (!result.success) {
    return res.status(400).json({ error: result.error })
  }

  return res.status(200).json({ 
    success: true,
    message: 'Email verified successfully! You can now sign in.' 
  })
}
