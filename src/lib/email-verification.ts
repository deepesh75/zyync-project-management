import crypto from 'crypto'
import { prisma } from './prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function generateVerificationToken(): Promise<string> {
  return crypto.randomBytes(32).toString('hex')
}

export async function sendVerificationEmail(email: string, token: string, name?: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`
  
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: 'Verify your email address',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify your email</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name || 'there'},</p>
              
              <p style="font-size: 16px; margin-bottom: 30px;">
                Thank you for signing up! Please verify your email address by clicking the button below:
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${verificationUrl}" 
                   style="background: #4f46e5; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);">
                  Verify Email Address
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 13px; color: #4f46e5; word-break: break-all; background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                ${verificationUrl}
              </p>
              
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 13px; color: #9ca3af; margin: 0;">
                  This verification link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Zyync. All rights reserved.</p>
            </div>
          </body>
        </html>
      `
    })
  } catch (error) {
    console.error('Error sending verification email:', error)
    throw new Error('Failed to send verification email')
  }
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        emailVerificationExpiry: true
      }
    })

    if (!user) {
      return { success: false, error: 'Invalid verification token' }
    }

    if (user.emailVerified) {
      return { success: false, error: 'Email already verified' }
    }

    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      return { success: false, error: 'Verification token has expired' }
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null
      }
    })

    return { success: true, userId: user.id }
  } catch (error) {
    console.error('Error verifying email token:', error)
    return { success: false, error: 'Verification failed' }
  }
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        emailVerified: true
      }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    if (user.emailVerified) {
      return { success: false, error: 'Email already verified' }
    }

    const token = await generateVerificationToken()
    const expiry = new Date()
    expiry.setHours(expiry.getHours() + 24) // 24 hour expiry

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiry: expiry
      }
    })

    await sendVerificationEmail(email, token, user.name || undefined)

    return { success: true }
  } catch (error) {
    console.error('Error resending verification email:', error)
    return { success: false, error: 'Failed to resend verification email' }
  }
}
