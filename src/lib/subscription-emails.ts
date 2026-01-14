import { Resend } from 'resend'
import { prisma } from './prisma'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SubscriptionEmailData {
  toEmail: string
  organizationName: string
  daysRemaining: number
  renewalDate: string
  planName: string
  billingPageUrl: string
}

/**
 * Send subscription expiring soon email
 */
export async function sendSubscriptionExpiringEmail(data: SubscriptionEmailData) {
  const { toEmail, organizationName, daysRemaining, renewalDate, planName, billingPageUrl } = data
  
  const subject = `⚠️ ${organizationName}: Subscription ${daysRemaining === 1 ? 'expires tomorrow' : `expires in ${daysRemaining} days`}`
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Zyync Project Management</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <h2 style="margin: 0 0 8px 0; color: #92400e; font-size: 18px;">⚠️ Subscription Renewal Reminder</h2>
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              Your subscription will expire ${daysRemaining === 1 ? 'tomorrow' : `in ${daysRemaining} days`}
            </p>
          </div>
          
          <h3 style="color: #111827; margin-top: 0;">Hello,</h3>
          
          <p style="color: #374151; font-size: 15px;">
            This is a friendly reminder that your <strong>${planName}</strong> subscription for <strong>${organizationName}</strong> will renew on <strong>${renewalDate}</strong>.
          </p>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h4 style="margin: 0 0 12px 0; color: #111827;">Subscription Details:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Organization:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${organizationName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Plan:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Renewal Date:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${renewalDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Days Remaining:</td>
                <td style="padding: 8px 0; color: ${daysRemaining <= 3 ? '#dc2626' : '#f59e0b'}; font-weight: 600; text-align: right;">${daysRemaining}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #374151; font-size: 15px;">
            <strong>What you need to do:</strong>
          </p>
          <ul style="color: #374151; font-size: 15px; line-height: 1.8;">
            <li>Ensure your payment method is up to date</li>
            <li>Verify sufficient funds are available</li>
            <li>Review your subscription settings if needed</li>
          </ul>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${billingPageUrl}" style="background: #4f46e5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
              Manage Billing
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 13px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            If your payment fails or subscription expires, your account will enter read-only mode. You'll be able to view your data but won't be able to create or edit projects and tasks.
          </p>
          
          <p style="color: #6b7280; font-size: 13px;">
            Questions? Contact us at <a href="mailto:support@zyync.com" style="color: #4f46e5;">support@zyync.com</a>
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">© 2026 Zyync. All rights reserved.</p>
          <p style="margin: 8px 0 0 0;">
            <a href="https://www.zyync.com" style="color: #9ca3af; text-decoration: none;">www.zyync.com</a>
          </p>
        </div>
      </body>
    </html>
  `
  
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'do-not-reply@zyync.com',
      to: toEmail,
      subject,
      html
    })
    console.log(`Sent expiration email to ${toEmail} for ${organizationName} (${daysRemaining} days)`)
  } catch (error) {
    console.error('Failed to send subscription expiring email:', error)
    throw error
  }
}

/**
 * Send subscription expired email
 */
export async function sendSubscriptionExpiredEmail(data: Omit<SubscriptionEmailData, 'daysRemaining' | 'renewalDate'>) {
  const { toEmail, organizationName, planName, billingPageUrl } = data
  
  const subject = `🔒 ${organizationName}: Subscription Expired - Read-Only Mode`
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Zyync Project Management</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <h2 style="margin: 0 0 8px 0; color: #991b1b; font-size: 18px;">🔒 Subscription Expired</h2>
            <p style="margin: 0; color: #991b1b; font-size: 14px;">
              Your account is now in read-only mode
            </p>
          </div>
          
          <h3 style="color: #111827; margin-top: 0;">Hello,</h3>
          
          <p style="color: #374151; font-size: 15px;">
            Your <strong>${planName}</strong> subscription for <strong>${organizationName}</strong> has expired.
          </p>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h4 style="margin: 0 0 12px 0; color: #111827;">What This Means:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 1.8;">
              <li><strong>Your data is safe</strong> - All projects, tasks, and comments are preserved</li>
              <li><strong>View access maintained</strong> - You can still view all your data</li>
              <li><strong>No editing allowed</strong> - Creating or editing is disabled</li>
              <li><strong>Instant reactivation</strong> - Renew to restore full access immediately</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${billingPageUrl}" style="background: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
              Reactivate Subscription
            </a>
          </div>
          
          <p style="color: #374151; font-size: 15px;">
            To regain full access and continue managing your projects:
          </p>
          <ol style="color: #374151; font-size: 15px; line-height: 1.8;">
            <li>Click the button above to visit your billing page</li>
            <li>Update your payment method if needed</li>
            <li>Reactivate your subscription</li>
          </ol>
          
          <p style="color: #6b7280; font-size: 13px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Need help? Our support team is here to assist you at <a href="mailto:support@zyync.com" style="color: #4f46e5;">support@zyync.com</a>
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">© 2026 Zyync. All rights reserved.</p>
        </div>
      </body>
    </html>
  `
  
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'do-not-reply@zyync.com',
      to: toEmail,
      subject,
      html
    })
    console.log(`Sent expired email to ${toEmail} for ${organizationName}`)
  } catch (error) {
    console.error('Failed to send subscription expired email:', error)
    throw error
  }
}

/**
 * Check all organizations and send expiration emails where needed
 */
export async function checkAndSendExpirationEmails() {
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)

  // Find organizations with expiring subscriptions
  const expiringOrgs = await prisma.organization.findMany({
    where: {
      AND: [
        { billingStatus: 'active' },
        { billingInterval: { not: 'lifetime' } },
        { currentPeriodEnd: { not: null } },
        {
          OR: [
            // Expires in 7 days
            {
              currentPeriodEnd: {
                gte: now,
                lte: in7Days
              }
            }
          ]
        }
      ]
    },
    include: {
      members: {
        where: { role: 'admin' },
        include: { user: true }
      }
    }
  })

  const emailsSent: string[] = []

  for (const org of expiringOrgs) {
    if (!org.currentPeriodEnd) continue

    const diffTime = org.currentPeriodEnd.getTime() - now.getTime()
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Only send at 7, 3, and 1 day marks
    if (daysRemaining !== 7 && daysRemaining !== 3 && daysRemaining !== 1) continue

    const planName = org.planId?.includes('pro') ? 'Pro' : org.planId === 'enterprise' ? 'Enterprise' : 'Free'
    const renewalDate = org.currentPeriodEnd.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })

    // Send to all admins
    for (const member of org.members) {
      try {
        await sendSubscriptionExpiringEmail({
          toEmail: member.user.email,
          organizationName: org.name,
          daysRemaining,
          renewalDate,
          planName,
          billingPageUrl: `https://www.zyync.com/organizations/${org.id}/billing`
        })
        emailsSent.push(`${member.user.email} (${org.name}, ${daysRemaining}d)`)
      } catch (error) {
        console.error(`Failed to send email to ${member.user.email}:`, error)
      }
    }
  }

  return { count: emailsSent.length, emails: emailsSent }
}
