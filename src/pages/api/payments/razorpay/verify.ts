import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../lib/prisma'
import { createInvoice } from '../../../../lib/invoices'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature,
    organizationId,
    planType,
    userCount,
    amount
  } = req.body
  
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Verify signature
  const secret = process.env.RAZORPAY_KEY_SECRET || ''
  const hmac = crypto.createHmac('sha256', secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex')

  if (hmac !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    // Fetch payment details from Razorpay to get actual status
    const keyId = process.env.RAZORPAY_KEY_ID || ''
    const keySecret = process.env.RAZORPAY_KEY_SECRET || ''
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    })
    
    if (!paymentResponse.ok) {
      return res.status(500).json({ error: 'Failed to verify payment with Razorpay' })
    }
    
    const paymentData = await paymentResponse.json()
    
    // Determine billing interval from planType and calculate seatsAllowed from userCount
    let billingInterval = 'monthly'
    let seatsAllowed = userCount || 1  // Use purchased userCount, fallback to 1 if not provided

    // Derive the canonical planId used throughout the app for plan checks
    let planId = 'free'
    if (planType) {
      if (planType.includes('enterprise')) planId = 'enterprise'
      else if (planType.includes('pro') || planType.includes('lifetime')) planId = 'pro'
      if (planType.includes('annual')) billingInterval = 'annual'
      else if (planType.includes('lifetime')) billingInterval = 'lifetime'
    }
    
    // Save payment record and update organization
    const payment = await prisma.payment.create({
      data: {
        organizationId: organizationId || '',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        amount: amount || paymentData.amount,
        currency: paymentData.currency || 'INR',
        status: paymentData.status || 'captured',
        method: paymentData.method,
        planType,
        billingInterval,
        receipt: paymentData.notes?.receipt,
        capturedAt: paymentData.status === 'captured' ? new Date() : null
      }
    })
    
    // Update organization subscription if payment is captured
    if (paymentData.status === 'captured' && organizationId) {
      const periodStart = new Date()
      const periodEnd = new Date(periodStart)
      if (billingInterval === 'annual') periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      else if (billingInterval === 'lifetime') periodEnd.setFullYear(periodEnd.getFullYear() + 100)
      else periodEnd.setMonth(periodEnd.getMonth() + 1)

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          planId,
          billingStatus: 'active',
          billingInterval,
          seatsAllowed,
          billingCycleAnchor: periodStart,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          razorpayPlanId: planType
        }
      })

      // Create invoice for this one-time payment
      try {
        const planName = planId === 'enterprise' ? 'Enterprise' : planType?.includes('lifetime') ? 'Pro Lifetime' : 'Pro'
        await createInvoice({
          organizationId,
          paymentId: payment.id,
          amount: amount || paymentData.amount,
          currency: paymentData.currency || 'INR',
          planName,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          notes: `One-time payment for ${planName} plan`
        })
      } catch (invoiceErr) {
        console.error('Failed to create invoice for one-time payment:', invoiceErr)
        // Non-fatal
      }
    }

    return res.status(200).json({ ok: true, paymentId: payment.id })
  } catch (err) {
    console.error('Payment verification error:', err)
    return res.status(500).json({ error: 'Failed to process payment' })
  }
}
