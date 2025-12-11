import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import crypto from 'crypto'
import { sendInvitationEmail } from '../../lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email, organizationId, role, invitedById } = req.body
    if (!email || !organizationId) return res.status(400).json({ error: 'email and organizationId required' })

    const token = crypto.randomBytes(20).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    try {
      const invite = await prisma.invitation.create({
        data: {
          email,
          organizationId,
          role: role || 'member',
          token,
          expiresAt,
          invitedById: invitedById || null
        }
      })

      const acceptUrl = `${process.env.NEXTAUTH_URL || ''}/auth/accept-invite?token=${token}`

      // send invitation email (best-effort)
      try {
        const org = await prisma.organization.findUnique({ where: { id: organizationId } })
        const inviter = invitedById ? await prisma.user.findUnique({ where: { id: invitedById } }) : null
        await sendInvitationEmail({ to: email, organizationName: org?.name || 'your organization', inviterName: inviter?.name || '', inviteLink: acceptUrl })
      } catch (err) {
        console.warn('Failed to send invite email (non-fatal)', err)
      }

      return res.status(201).json({ invite, acceptUrl })
    } catch (err: any) {
      console.error('Create invite error', err)
      return res.status(500).json({ error: err.message || 'Server error' })
    }
  }

  res.setHeader('Allow', ['POST'])
  res.status(405).end('Method Not Allowed')
}
