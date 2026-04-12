import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { compare } from 'bcryptjs'

// TEMPORARY DEBUG ENDPOINT - DELETE AFTER USE
// Only returns diagnostic info, never returns password data
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true }
    })

    if (!user) return res.status(200).json({ step: 'user_not_found', email })
    if (!user.passwordHash) return res.status(200).json({ step: 'no_password_hash', id: user.id })

    const valid = await compare(password, user.passwordHash)
    return res.status(200).json({ step: valid ? 'password_ok' : 'password_mismatch', id: user.id })
  } catch (err: any) {
    return res.status(200).json({ step: 'db_error', message: err.message })
  }
}
