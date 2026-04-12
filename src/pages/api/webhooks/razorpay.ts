import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { prisma } from '../../../lib/prisma'
import { sendSubscriptionRenewedEmail, sendSubscriptionCancelledEmail, sendPaymentFailureEmail } from '../../../lib/subscription-emails'
import { createInvoice } from '../../../lib/invoices'
import { restoreOrganizationAccess } from '../../../lib/access-restriction'

export const config = {
  api: {
    bodyParser: false
  }
}

async function buffer(readable: any) {
  const chunks: Uint8Array[] = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const buf = await buffer(req)
  const sig = req.headers['x-razorpay-signature'] as string || ''
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || ''
  const expected = crypto.createHmac('sha256', secret).update(buf).digest('hex')

  if (sig !== expected) {
    console.warn('Invalid Razorpay webhook signature')
    return res.status(400).json({ ok: false })
  }

  try {
    const event = JSON.parse(buf.toString())
    console.log('Razorpay webhook event:', event.event)
    
    // Handle different event types
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity)
        break
      
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity)
        break
      
      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity)
        break
      
      case 'subscription.charged':
        await handleSubscriptionCharged(event.payload.subscription.entity, event.payload.payment.entity)
        break
      
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.payload.subscription.entity)
        break
      
      default:
        console.log('Unhandled event type:', event.event)
    }
    
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Failed to parse webhook', err)
    return res.status(500).json({ ok: false })
  }
}

async function handlePaymentCaptured(payment: any) {
  try {
    // Update payment record status
    await prisma.payment.updateMany({
      where: { razorpayPaymentId: payment.id },
      data: {
        status: 'captured',
        capturedAt: new Date(),
        method: payment.method
      }
    })
    console.log('Payment captured:', payment.id)
  } catch (err) {
    console.error('Error handling payment.captured:', err)
  }
}

async function handlePaymentFailed(payment: any) {
  try {
    // Update payment record status
    await prisma.payment.updateMany({
      where: { razorpayPaymentId: payment.id },
      data: { status: 'failed' }
    })
    
    // Find the payment record to get organization details
    const paymentRecord = await prisma.payment.findFirst({
      where: { razorpayPaymentId: payment.id }
    })
    
    if (!paymentRecord?.organizationId) {
      console.log('No organization found for failed payment:', payment.id)
      return
    }
    
    // Update organization billing status to past_due
    const org = await prisma.organization.update({
      where: { id: paymentRecord.organizationId },
      data: { billingStatus: 'past_due' },
      include: {
        members: {
          where: { role: 'admin' },
          include: { user: true }
        }
      }
    })
    
    // Get plan name for email
    const planName = org.razorpayPlanId?.includes('pro') ? 'Pro' : org.razorpayPlanId === 'enterprise' ? 'Enterprise' : 'Free'
    const billingPageUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/organizations/${org.id}/billing`
    
    // Extract failure reason from Razorpay response if available
    const failureReason = payment.description || payment.error_description || 'Payment processor declined the transaction'
    
    // Send payment failure emails to all organization admins
    for (const member of org.members) {
      try {
        await sendPaymentFailureEmail({
          toEmail: member.user.email,
          organizationName: org.name,
          planName,
          amount: payment.amount || paymentRecord.amount,
          currency: payment.currency || paymentRecord.currency || 'INR',
          failureReason,
          daysUntilSuspension: 3, // Configurable grace period
          billingPageUrl
        })
      } catch (emailErr) {
        console.error(`Failed to send payment failure email to ${member.user.email}:`, emailErr)
        // Don't fail the entire handler if email fails
      }
    }
    
    console.log('Payment failed:', payment.id, 'Organization:', org.id, 'Emails sent to', org.members.length, 'admins')
  } catch (err) {
    console.error('Error handling payment.failed:', err)
  }
}

async function handleOrderPaid(order: any) {
  console.log('Order paid:', order.id)
  // Additional processing if needed
}

async function handleSubscriptionCharged(subscription: any, payment: any) {
  try {
    // Calculate period dates from subscription
    const periodStart = subscription.current_start 
      ? new Date(subscription.current_start * 1000) 
      : new Date()
    const razorpayPeriodEnd = subscription.current_end 
      ? new Date(subscription.current_end * 1000) 
      : null

    // Find organization with admin members
    const org = await prisma.organization.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
      include: {
        members: {
          where: { role: 'admin' },
          include: { user: true }
        }
      }
    })

    if (!org) {
      console.warn('Organization not found for subscription:', subscription.id)
      return
    }

    // Determine period end: prefer Razorpay's value, fall back to calculating from billingInterval
    let periodEnd: Date | null = razorpayPeriodEnd
    if (!periodEnd) {
      const interval = org.billingInterval || 
        (subscription.billing_frequency === 'monthly' ? 'monthly' : 'annual')
      periodEnd = new Date(periodStart)
      if (interval === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      } else {
        // Default to monthly
        periodEnd.setMonth(periodEnd.getMonth() + 1)
      }
      console.log(`Calculated periodEnd from billingInterval (${interval}):`, periodEnd)
    }
    
    // Determine plan name from subscription
    const planName = subscription.plan_id?.includes('pro') ? 'Pro' : 
                     subscription.plan_id === 'enterprise' ? 'Enterprise' : 'Free'
    
    // Format dates for email
    const renewalDate = periodStart.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })
    const nextRenewalDate = periodEnd?.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    }) || 'N/A'
    
    // Update organization with new period dates
    // If billingCycleAnchor is not set, set it to periodStart (first renewal)
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        billingStatus: 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        billingCycleAnchor: org.billingCycleAnchor || periodStart, // Set anchor on first renewal
        canceledAt: null,
        cancelAtPeriodEnd: false
      }
    })
    
    // Restore access if was previously restricted
    try {
      if (org.billingStatus === 'access_restricted') {
        await restoreOrganizationAccess(org.id)
        console.log(`Access restored for organization ${org.id} upon subscription renewal`)
      }
    } catch (error) {
      console.error(`Failed to restore access for org ${org.id}:`, error)
      // Non-fatal - don't fail the entire renewal process
    }
    
    // Create payment record for this renewal
    let paymentRecord: any = null
    if (payment) {
      paymentRecord = await prisma.payment.create({
        data: {
          organizationId: org.id,
          razorpayOrderId: payment.order_id || `ord_${Date.now()}`,
          razorpayPaymentId: payment.id,
          razorpaySubscriptionId: subscription.id,
          amount: payment.amount,
          currency: payment.currency || 'INR',
          status: 'captured',
          method: payment.method,
          planType: subscription.plan_id,
          billingInterval: subscription.billing_frequency === 'monthly' ? 'monthly' : 'annual',
          capturedAt: new Date()
        }
      })
      
      // Generate invoice for this payment
      try {
        await createInvoice({
          organizationId: org.id,
          paymentId: paymentRecord.id,
          amount: payment.amount,
          currency: payment.currency || 'INR',
          planName,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd || new Date(),
          notes: `Subscription renewal for ${org.name}`
        })
      } catch (invoiceErr) {
        console.error('Failed to create invoice:', invoiceErr)
        // Don't fail the entire handler if invoice creation fails
      }
    }
    
    // Send renewal confirmation emails to all organization admins
    const billingPageUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/organizations/${org.id}/billing`
    
    for (const member of org.members) {
      try {
        await sendSubscriptionRenewedEmail({
          toEmail: member.user.email,
          organizationName: org.name,
          planName,
          seatsAllowed: org.seatsAllowed,
          amount: payment?.amount || 0,
          currency: payment?.currency || 'INR',
          renewalDate,
          nextRenewalDate,
          billingPageUrl
        })
      } catch (emailErr) {
        console.error(`Failed to send renewal email to ${member.user.email}:`, emailErr)
        // Don't fail the entire handler if email fails
      }
    }
    
    console.log('Subscription renewed:', subscription.id, 'Period:', periodStart, '-', periodEnd, 'Emails sent to', org.members.length, 'admins')
  } catch (err) {
    console.error('Error handling subscription.charged:', err)
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  try {
    const periodEnd = subscription.current_end 
      ? new Date(subscription.current_end * 1000) 
      : null
    
    const isImmediate = !subscription.cancel_at_cycle_end
    const cancelledAt = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    // Find organization by subscription ID
    const org = await prisma.organization.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
      include: {
        members: {
          where: { role: 'admin' },
          include: { user: true }
        }
      }
    })
    
    if (!org) {
      console.warn('No organization found for subscription:', subscription.id)
      return
    }
    
    // Update organization status
    await prisma.organization.update({
      where: { id: org.id },
      data: { 
        billingStatus: 'canceled',
        canceledAt: new Date(),
        cancelAtPeriodEnd: subscription.cancel_at_cycle_end || false,
        currentPeriodEnd: periodEnd // Allow access until period ends
      }
    })
    
    // Get plan name for email
    const planName = org.razorpayPlanId?.includes('pro') ? 'Pro' : org.razorpayPlanId === 'enterprise' ? 'Enterprise' : 'Free'
    const billingPageUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/organizations/${org.id}/billing`
    
    // Send cancellation emails to all organization admins
    for (const member of org.members) {
      try {
        await sendSubscriptionCancelledEmail({
          toEmail: member.user.email,
          organizationName: org.name,
          planName,
          cancelledAt,
          currentPeriodEnd: periodEnd?.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          isImmediate,
          billingPageUrl
        })
      } catch (emailErr) {
        console.error(`Failed to send cancellation email to ${member.user.email}:`, emailErr)
        // Don't fail the entire handler if email fails
      }
    }
    
    console.log('Subscription cancelled:', subscription.id, 'Cancel at period end:', subscription.cancel_at_cycle_end, 'Emails sent to', org.members.length, 'admins')
  } catch (err) {
    console.error('Error handling subscription.cancelled:', err)
  }
}
