import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { hash } from 'bcryptjs'
import { generateVerificationToken, sendVerificationEmail } from '../../../lib/email-verification'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, password, name, invitationToken, organizationName } = req.body
  
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' })
  }

  const passwordHash = await hash(password, 10)

  // Generate email verification token
  const verificationToken = await generateVerificationToken()
  const verificationExpiry = new Date()
  verificationExpiry.setHours(verificationExpiry.getHours() + 24) // 24 hour expiry

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

  // If not invited, check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser && !isInvitedUser) {
    return res.status(409).json({ error: 'User exists' })
  }

  // If invited user already exists in system, update password and add to org
  // If invited user doesn't exist, create new account
  let user = existingUser
  
  if (existingUser && isInvitedUser) {
    // Update password for existing user being re-invited
    user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        name: name || existingUser.name,
        emailVerified: true,  // Mark as verified since invite proves email ownership
        tokenVersion: 0  // Reset token version so they can log in with new password
      }
    })
  } else if (!existingUser) {
    // Create new user if this is the first time
    user = await prisma.user.create({ 
      data: { 
        email, 
        passwordHash, 
        name,
        emailVerified: isInvitedUser,  // Auto-verify if invited
        emailVerificationToken: isInvitedUser ? null : verificationToken,
        emailVerificationExpiry: isInvitedUser ? null : verificationExpiry
      } 
    })
  } else {
    // Should never reach here - caught earlier at line 55
    return res.status(400).json({ error: 'User already exists' })
  }

  if (!user) {
    return res.status(500).json({ error: 'Failed to create or update user' })
  }

  // Send verification email (skip for invited users - they're auto-verified)
  if (!isInvitedUser) {
    try {
      await sendVerificationEmail(email, verificationToken, name)
    } catch (error) {
      console.error('Failed to send verification email:', error)
      // Don't fail signup if email fails, user can request resend
    }
  }

  // If invitation, add user to organization and mark invitation as accepted
  if (invitationToken && organizationId) {
    // Check if user is already a member of this organization
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id
        }
      }
    })

    if (!existingMembership) {
      // Add user to organization
      await prisma.organizationMember.create({
        data: {
          organizationId,
          userId: user.id,
          role
        }
      })
    } else {
      // User was previously a member, update their role if different
      if (existingMembership.role !== role) {
        await prisma.organizationMember.update({
          where: {
            organizationId_userId: {
              organizationId,
              userId: user.id
            }
          },
          data: { role }
        })
      }
    }

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { token: invitationToken },
      data: { acceptedAt: new Date() }
    })
  } else if (organizationName) {
    // Create new organization if provided
    let slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    
    // Ensure slug is unique by adding a random suffix if needed
    const existingOrg = await prisma.organization.findUnique({ where: { slug } })
    if (existingOrg) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`
    }
    
    await prisma.organization.create({
      data: {
        name: organizationName,
        slug,
        planId: 'free', // New organizations start on free plan
        seatsAllowed: 5, // Free plan allows 5 seats
        seatsUsed: 1, // Creator uses 1 seat
        billingStatus: 'active',
        members: {
          create: {
            userId: user.id,
            role: 'admin'
          }
        }
      }
    })
  }

  return res.status(201).json({ 
    id: user.id,
    message: 'Account created! Please check your email to verify your account.'
  })
}
