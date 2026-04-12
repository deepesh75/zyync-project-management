import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { hash } from 'bcryptjs'
import { generateVerificationToken, sendVerificationEmail } from '../../../lib/email-verification'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { email, password, name, invitationToken, organizationName } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' })
    }

    const passwordHash = await hash(password, 10)

    // Generate email verification token
    const verificationToken = await generateVerificationToken()
    const verificationExpiry = new Date()
    verificationExpiry.setHours(verificationExpiry.getHours() + 24)

    // Check if there's an invitation token
    let organizationId: string | undefined
    let role = 'member'
    let isInvitedUser = false

    if (invitationToken) {
      const invitation = await prisma.invitation.findUnique({
        where: { token: invitationToken }
      })

      if (!invitation) {
        return res.status(400).json({ error: 'Invalid invitation' })
      }

      if (invitation.acceptedAt) {
        return res.status(400).json({ error: 'Invitation already used' })
      }

      if (invitation.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Invitation expired' })
      }

      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ error: 'Email does not match invitation' })
      }

      organizationId = invitation.organizationId
      role = invitation.role
      isInvitedUser = true
    }

    // Check if user already exists (select only guaranteed columns)
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true }
    })
    if (existingUser && !isInvitedUser) {
      return res.status(409).json({ error: 'User exists' })
    }

    let user: any = existingUser

    if (existingUser && isInvitedUser) {
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          name: name || existingUser.name,
          emailVerified: true,
          tokenVersion: 0
        }
      })
    } else if (!existingUser) {
      user = await prisma.user.create({ 
        data: { 
          email, 
          passwordHash, 
          name,
          emailVerified: isInvitedUser,
          emailVerificationToken: isInvitedUser ? null : verificationToken,
          emailVerificationExpiry: isInvitedUser ? null : verificationExpiry
        } 
      })
    } else {
      return res.status(400).json({ error: 'User already exists' })
    }

    if (!user) {
      return res.status(500).json({ error: 'Failed to create or update user' })
    }

    // Send verification email (skip for invited users - they're auto-verified)
    if (!isInvitedUser) {
      try {
        await sendVerificationEmail(email, verificationToken, name)
      } catch (emailErr) {
        console.error('Failed to send verification email:', emailErr)
        // Don't fail signup if email fails
      }
    }

    // If invitation, add user to organization and mark invitation as accepted
    if (invitationToken && organizationId) {
      const existingMembership = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.id } }
      })

      if (!existingMembership) {
        await prisma.organizationMember.create({
          data: { organizationId, userId: user.id, role }
        })
      } else if (existingMembership.role !== role) {
        await prisma.organizationMember.update({
          where: { organizationId_userId: { organizationId, userId: user.id } },
          data: { role }
        })
      }

      await prisma.invitation.update({
        where: { token: invitationToken },
        data: { acceptedAt: new Date() }
      })
    } else if (organizationName) {
      let slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      
      const existingOrg = await prisma.organization.findUnique({ where: { slug } })
      if (existingOrg) {
        slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`
      }
      
      await prisma.organization.create({
        data: {
          name: organizationName,
          slug,
          planId: 'free',
          seatsAllowed: 5,
          seatsUsed: 1,
          billingStatus: 'active',
          members: { create: { userId: user.id, role: 'admin' } }
        }
      })
    }

    return res.status(201).json({ 
      id: user.id,
      message: 'Account created! Please check your email to verify your account.'
    })
  } catch (err: any) {
    console.error('Signup error:', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
