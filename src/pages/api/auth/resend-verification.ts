import type { NextApiRequest, NextApiResponse } from 'next'
import { resendVerificationEmail } from '../../../lib/email-verification'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email required' })
  }

  const result = await resendVerificationEmail(email)

  if (!result.success) {
    return res.status(400).json({ error: result.error })
  }

  return res.status(200).json({ 
    success: true,
    message: 'Verification email sent! Please check your inbox.' 
  })
}
