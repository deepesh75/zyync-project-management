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

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return res.status(409).json({ error: 'User exists' })

  const passwordHash = await hash(password, 10)

  // Generate email verification token
  const verificationToken = await generateVerificationToken()
  const verificationExpiry = new Date()
  verificationExpiry.setHours(verificationExpiry.getHours() + 24) // 24 hour expiry

  // Check if there's an invitation token
  let organizationId: string | undefined
  let role = 'member'

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
  }

  // Create user
  const user = await prisma.user.create({ 
    data: { 
      email, 
      passwordHash, 
      name,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationExpiry
    } 
  })

  // Send verification email
  try {
    await sendVerificationEmail(email, verificationToken, name)
  } catch (error) {
    console.error('Failed to send verification email:', error)
    // Don't fail signup if email fails, user can request resend
  }

  // If invitation, add user to organization and mark invitation as accepted
  if (invitationToken && organizationId) {
    await prisma.$transaction([
      prisma.organizationMember.create({
        data: {
          organizationId,
          userId: user.id,
          role
        }
      }),
      prisma.invitation.update({
        where: { token: invitationToken },
        data: { acceptedAt: new Date() }
      })
    ])
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
        seatsAllowed: 1, // Free plan starts with 1 seat
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
