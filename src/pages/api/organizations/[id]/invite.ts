import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import crypto from 'crypto'
import { sendInvitationEmail } from '../../../../lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Invalid ID' })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) return res.status(404).json({ error: 'User not found' })

  // Check if user is admin of this organization
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: id,
        userId: user.id
      }
    }
  })

  if (!membership || membership.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can invite members' })
  }

  if (req.method === 'POST') {
    const { email, role = 'member' } = req.body

    if (!email) return res.status(400).json({ error: 'Email is required' })
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    // Check if user already exists and is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        organizationMemberships: {
          where: {
            organizationId: id
          }
        }
      }
    })

    if (existingUser && existingUser.organizationMemberships.length > 0) {
      return res.status(400).json({ error: 'User is already a member of this organization' })
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        organizationId: id,
        acceptedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    })

    if (existingInvitation) {
      return res.status(400).json({ error: 'An invitation has already been sent to this email' })
    }

    // Create invitation token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

    const invitation = await prisma.invitation.create({
      data: {
        email,
        organizationId: id,
        role,
        token,
        expiresAt,
        invitedById: user.id
      },
      include: {
        organization: true,
        invitedBy: true
      }
    })

    const inviteLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/accept-invite?token=${token}`

    // Send invitation email
    if (process.env.RESEND_API_KEY) {
      await sendInvitationEmail({
        to: email,
        organizationName: invitation.organization.name,
        inviterName: invitation.invitedBy.name || invitation.invitedBy.email,
        inviteLink
      })
    } else {
      console.warn('RESEND_API_KEY not set - email not sent. Invite link:', inviteLink)
    }

    return res.status(201).json({
      ...invitation,
      inviteLink
    })
  }

  res.setHeader('Allow', ['POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
