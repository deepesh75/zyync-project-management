import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { token } = req.query
  if (!token || Array.isArray(token)) {
    return res.status(400).json({ error: 'Invalid token' })
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: true
    }
  })

  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found' })
  }

  if (invitation.acceptedAt) {
    return res.status(400).json({ error: 'Invitation already accepted' })
  }

  if (invitation.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invitation has expired' })
  }

  return res.status(200).json({
    email: invitation.email,
    organizationName: invitation.organization.name,
    role: invitation.role
  })
}
