import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { syncSeatsUsed } from '../../../lib/seats'
import { canAddUser } from '../../../lib/access-control'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { token, userId } = req.body
  if (!token || !userId) return res.status(400).json({ error: 'token and userId required' })

  try {
    const invite = await prisma.invitation.findUnique({ where: { token } })
    if (!invite) return res.status(404).json({ error: 'Invitation not found' })
    if (invite.expiresAt && invite.expiresAt < new Date()) return res.status(400).json({ error: 'Invitation expired' })

    // Check if organization can add more users (subscription + seat limits)
    const accessCheck = await canAddUser(invite.organizationId)
    if (!accessCheck.allowed) {
      return res.status(403).json({ 
        error: accessCheck.message || 'Cannot accept invitation',
        reason: accessCheck.reason,
        upgradeRequired: true
      })
    }

    // add membership
    await prisma.organizationMember.create({ data: { organizationId: invite.organizationId, userId, role: invite.role } })

    await prisma.invitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } })

    // Sync seats count for org (this will count active members + pending invites)
    try {
      await syncSeatsUsed(invite.organizationId)
      
      // Also update legacy seats field for backward compatibility
      const memberCount = await prisma.organizationMember.count({ where: { organizationId: invite.organizationId } })
      await prisma.organization.update({ where: { id: invite.organizationId }, data: { seats: memberCount } })
    } catch (err) {
      console.warn('Failed to sync seats (non-fatal)', err)
    }

    return res.status(200).json({ message: 'Accepted' })
  } catch (err: any) {
    console.error('Accept invite error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
