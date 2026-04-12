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
 * Send subscription renewal confirmation email
 */
export async function sendSubscriptionRenewedEmail(data: {
  toEmail: string
  organizationName: string
  planName: string
  seatsAllowed: number
  amount: number
  currency: string
  renewalDate: string
  nextRenewalDate: string
  billingPageUrl: string
}) {
  const { toEmail, organizationName, planName, seatsAllowed, amount, currency, renewalDate, nextRenewalDate, billingPageUrl } = data
  
  const subject = `✅ ${organizationName}: Subscription Renewed Successfully`
  
  const amountFormatted = (amount / 100).toFixed(2)
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Zyync Project Management</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <h2 style="margin: 0 0 8px 0; color: #065f46; font-size: 18px;">✅ Subscription Renewed Successfully</h2>
            <p style="margin: 0; color: #065f46; font-size: 14px;">
              Your payment has been processed and your subscription is active
            </p>
          </div>
          
          <h3 style="color: #111827; margin-top: 0;">Hello,</h3>
          
          <p style="color: #374151; font-size: 15px;">
            Thank you! Your <strong>${planName}</strong> subscription for <strong>${organizationName}</strong> has been renewed successfully.
          </p>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h4 style="margin: 0 0 16px 0; color: #111827;">Renewal Receipt:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Organization:</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 600; text-align: right;">${organizationName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Plan:</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 600; text-align: right;">${planName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Team Members:</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 600; text-align: right;">${seatsAllowed} seats</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Renewal Date:</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 600; text-align: right;">${renewalDate}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Next Renewal:</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 600; text-align: right;">${nextRenewalDate}</td>
              </tr>
              <tr style="background: #f0fdf4;">
                <td style="padding: 12px 0; color: #111827; font-size: 15px; font-weight: 700;">Amount Charged:</td>
                <td style="padding: 12px 0; color: #10b981; font-weight: 700; text-align: right; font-size: 16px;">${currency} ${amountFormatted}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">ℹ️ What's Included:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
              <li>${seatsAllowed} team member seats</li>
              <li>Full access to all projects and tasks</li>
              <li>24/7 support</li>
              <li>Auto-renewal until cancelled</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${billingPageUrl}" style="background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
              View Billing Details
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 13px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            If you did not authorize this charge or have questions about your subscription, please contact our support team at <a href="mailto:support@zyync.com" style="color: #4f46e5;">support@zyync.com</a>
          </p>
          
          <p style="color: #6b7280; font-size: 13px; margin-top: 12px;">
            You can manage your subscription and update your billing settings anytime from your account dashboard.
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
    console.log(`Sent renewal confirmation email to ${toEmail} for ${organizationName}`)
  } catch (error) {
    console.error('Failed to send subscription renewal email:', error)
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

/**
 * Send subscription cancellation confirmation email
 */
export async function sendSubscriptionCancelledEmail(data: {
  toEmail: string
  organizationName: string
  planName: string
  cancelledAt: string
  currentPeriodEnd?: string
  isImmediate: boolean
  billingPageUrl: string
}) {
  const { toEmail, organizationName, planName, cancelledAt, currentPeriodEnd, isImmediate, billingPageUrl } = data
  
  const subject = isImmediate 
    ? `❌ ${organizationName}: Subscription cancelled immediately`
    : `❌ ${organizationName}: Subscription will cancel at period end`
  
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
          <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <h2 style="margin: 0 0 8px 0; color: #7f1d1d; font-size: 18px;">❌ Subscription Cancelled</h2>
            <p style="margin: 0; color: #7f1d1d; font-size: 14px;">
              ${isImmediate ? 'Effective immediately' : `Effective on ${currentPeriodEnd || 'the end of your billing period'}`}
            </p>
          </div>
          
          <h3 style="color: #111827; margin-top: 0;">Hello,</h3>
          
          <p style="color: #374151; font-size: 15px;">
            We're sorry to see you go. Your <strong>${planName}</strong> subscription for <strong>${organizationName}</strong> has been cancelled.
          </p>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h4 style="margin: 0 0 12px 0; color: #111827;">Cancellation Details:</h4>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li style="color: #374151; margin: 8px 0;">
                <strong>Cancelled on:</strong> ${cancelledAt}
              </li>
              ${currentPeriodEnd && !isImmediate ? `
                <li style="color: #374151; margin: 8px 0;">
                  <strong>Access until:</strong> ${currentPeriodEnd}
                </li>
              ` : ''}
              <li style="color: #374151; margin: 8px 0;">
                <strong>Status:</strong> ${isImmediate ? 'Cancelled immediately' : 'Cancellation scheduled at period end'}
              </li>
            </ul>
          </div>
          
          ${!isImmediate && currentPeriodEnd ? `
            <div style="background: #dbeafe; border-left: 4px solid #0284c7; padding: 16px; border-radius: 4px; margin: 24px 0;">
              <p style="margin: 0; color: #075985; font-size: 14px;">
                <strong>ℹ️ Note:</strong> Your team will have access to all features until <strong>${currentPeriodEnd}</strong>. After that, your organization will be downgraded to the Free plan with limited features.
              </p>
            </div>
          ` : ''}
          
          <div style="margin: 24px 0;">
            <p style="color: #374151; font-size: 15px;">
              If you'd like to reactivate your subscription or have any questions, please visit your billing page:
            </p>
            <a href="${billingPageUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 16px 0;">View Billing Settings</a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 13px; text-align: center;">
              Have questions? <a href="https://www.zyync.com/support" style="color: #667eea; text-decoration: none;">Contact support</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} Zyync. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    await resend.emails.send({
      from: 'noreply@zyync.com',
      to: toEmail,
      subject,
      html
    })
    console.log(`Subscription cancellation email sent to ${toEmail}`)
  } catch (error) {
    console.error(`Failed to send cancellation email to ${toEmail}:`, error)
    throw error
  }
}

/**
 * Send payment failure notification email
 */
export async function sendPaymentFailureEmail(data: {
  toEmail: string
  organizationName: string
  planName: string
  amount: number
  currency: string
  failureReason?: string
  daysUntilSuspension?: number
  billingPageUrl: string
}) {
  const { toEmail, organizationName, planName, amount, currency, failureReason, daysUntilSuspension = 3, billingPageUrl } = data
  
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount / 100)
  
  const subject = `⚠️ ${organizationName}: Payment failed - Action required`
  
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
          <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <h2 style="margin: 0 0 8px 0; color: #7f1d1d; font-size: 18px;">⚠️ Payment Failed</h2>
            <p style="margin: 0; color: #7f1d1d; font-size: 14px;">
              We were unable to process your payment. Please update your payment method.
            </p>
          </div>
          
          <h3 style="color: #111827; margin-top: 0;">Hello,</h3>
          
          <p style="color: #374151; font-size: 15px;">
            We attempted to charge your ${planName} subscription for <strong>${organizationName}</strong>, but the payment failed.
          </p>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h4 style="margin: 0 0 12px 0; color: #111827;">Failed Payment Details:</h4>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li style="color: #374151; margin: 8px 0;">
                <strong>Amount:</strong> ${formattedAmount}
              </li>
              <li style="color: #374151; margin: 8px 0;">
                <strong>Plan:</strong> ${planName}
              </li>
              ${failureReason ? `
                <li style="color: #374151; margin: 8px 0;">
                  <strong>Reason:</strong> ${failureReason}
                </li>
              ` : ''}
              <li style="color: #374151; margin: 8px 0;">
                <strong>Failed on:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </li>
            </ul>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 24px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>⏰ Important:</strong> If payment is not resolved within ${daysUntilSuspension} days, your ${planName} subscription will be suspended and your team will lose access to Zyync.
            </p>
          </div>
          
          <div style="margin: 24px 0;">
            <p style="color: #374151; font-size: 15px; margin-top: 0;">
              Please update your payment method or add an alternative payment option to reactivate your subscription:
            </p>
            <a href="${billingPageUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 16px 0;">Update Payment Method</a>
          </div>
          
          <div style="background: #eff6ff; border-left: 4px solid #0284c7; padding: 16px; border-radius: 4px; margin: 24px 0;">
            <h4 style="margin: 0 0 8px 0; color: #075985; font-size: 14px;">Why did this fail?</h4>
            <p style="margin: 8px 0 0 0; color: #075985; font-size: 13px;">
              Payments can fail due to: card expiry, insufficient funds, fraud checks, or bank declines. Please verify your payment method and try again.
            </p>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 13px; text-align: center;">
              Need help? <a href="https://www.zyync.com/support" style="color: #667eea; text-decoration: none;">Contact support</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} Zyync. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    await resend.emails.send({
      from: 'noreply@zyync.com',
      to: toEmail,
      subject,
      html
    })
    console.log(`Payment failure email sent to ${toEmail}`)
  } catch (error) {
    console.error(`Failed to send payment failure email to ${toEmail}:`, error)
    throw error
  }
}
