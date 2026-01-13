import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { prisma } from '../../../lib/prisma'

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
    
    // Update organization billing status
    const paymentRecord = await prisma.payment.findFirst({
      where: { razorpayPaymentId: payment.id }
    })
    
    if (paymentRecord?.organizationId) {
      await prisma.organization.update({
        where: { id: paymentRecord.organizationId },
        data: { billingStatus: 'past_due' }
      })
    }
    
    console.log('Payment failed:', payment.id)
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
    const periodEnd = subscription.current_end 
      ? new Date(subscription.current_end * 1000) 
      : null

    // Find organization
    const org = await prisma.organization.findFirst({
      where: { razorpaySubscriptionId: subscription.id }
    })

    if (!org) {
      console.warn('Organization not found for subscription:', subscription.id)
      return
    }
    
    // Update organization with new period dates
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        billingStatus: 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        canceledAt: null,
        cancelAtPeriodEnd: false
      }
    })
    
    // Create payment record for this renewal
    if (payment) {
      await prisma.payment.create({
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
    }
    
    console.log('Subscription renewed:', subscription.id, 'Period:', periodStart, '-', periodEnd)
  } catch (err) {
    console.error('Error handling subscription.charged:', err)
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  try {
    const periodEnd = subscription.current_end 
      ? new Date(subscription.current_end * 1000) 
      : null
    
    // Find organization by subscription ID and update status
    await prisma.organization.updateMany({
      where: { razorpaySubscriptionId: subscription.id },
      data: { 
        billingStatus: 'canceled',
        canceledAt: new Date(),
        cancelAtPeriodEnd: subscription.cancel_at_cycle_end || false,
        currentPeriodEnd: periodEnd // Allow access until period ends
      }
    })
    
    console.log('Subscription cancelled:', subscription.id, 'Cancel at period end:', subscription.cancel_at_cycle_end)
  } catch (err) {
    console.error('Error handling subscription.cancelled:', err)
  }
}
