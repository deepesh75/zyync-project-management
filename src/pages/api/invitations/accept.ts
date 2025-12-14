import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { token, userId } = req.body
  if (!token || !userId) return res.status(400).json({ error: 'token and userId required' })

  try {
    const invite = await prisma.invitation.findUnique({ where: { token } })
    if (!invite) return res.status(404).json({ error: 'Invitation not found' })
    if (invite.expiresAt && invite.expiresAt < new Date()) return res.status(400).json({ error: 'Invitation expired' })

    // add membership
    await prisma.organizationMember.create({ data: { organizationId: invite.organizationId, userId, role: invite.role } })

    await prisma.invitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } })

    // Update seats count for org
    try {
      const memberCount = await prisma.organizationMember.count({ where: { organizationId: invite.organizationId } })
      await prisma.organization.update({ where: { id: invite.organizationId }, data: { seats: memberCount } })

      // Note: PayPal subscription updates would be handled in webhook events
      // (user seat quantity updates are typically handled via PayPal billing cycles)
    } catch (err) {
      console.warn('Failed to sync seats (non-fatal)', err)
    }

    return res.status(200).json({ message: 'Accepted' })
  } catch (err: any) {
    console.error('Accept invite error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
