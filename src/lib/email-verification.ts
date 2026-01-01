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
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 0; background: #f3f4f6;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <div style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); padding: 15px 25px; border-radius: 50px; display: inline-block; margin-bottom: 20px;">
                <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">Zyync</h1>
              </div>
              <h2 style="color: white; margin: 10px 0 0 0; font-size: 22px; font-weight: 600;">Welcome aboard! 🎉</h2>
            </div>
            
            <div style="background: white; padding: 40px 30px;">
              <p style="font-size: 16px; margin-bottom: 10px; color: #374151;">Hi <strong>${name || 'there'}</strong>,</p>
              
              <p style="font-size: 16px; margin-bottom: 30px; color: #4b5563;">
                Thanks for signing up for Zyync! We're excited to help you and your team manage projects more efficiently.
              </p>
              
              <p style="font-size: 16px; margin-bottom: 30px; color: #4b5563;">
                To get started, please verify your email address by clicking the button below:
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${verificationUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 48px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4); letter-spacing: 0.5px; text-transform: uppercase;">
                  Verify Email →
                </a>
              </div>
              
              <div style="background: #f9fafb; border-left: 4px solid #6366f1; padding: 20px; margin: 30px 0; border-radius: 6px;">
                <p style="font-size: 14px; color: #6b7280; margin: 0 0 10px 0; font-weight: 600;">
                  Or copy and paste this link:
                </p>
                <p style="font-size: 13px; color: #4f46e5; word-break: break-all; margin: 0; font-family: monospace;">
                  ${verificationUrl}
                </p>
              </div>
              
              <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #f3f4f6;">
                <p style="font-size: 14px; color: #6b7280; margin: 0 0 15px 0;">
                  <strong>What's next?</strong>
                </p>
                <ul style="font-size: 14px; color: #4b5563; padding-left: 20px; margin: 0;">
                  <li style="margin-bottom: 8px;">Create your first project</li>
                  <li style="margin-bottom: 8px;">Invite your team members</li>
                  <li style="margin-bottom: 8px;">Explore Kanban, Calendar, and Timeline views</li>
                </ul>
              </div>
              
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                  ⚠️ This verification link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; padding: 30px 20px; background: #f9fafb;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 5px 0;">Need help? Email us at support@zyync.com</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Zyync. All rights reserved.</p>
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
