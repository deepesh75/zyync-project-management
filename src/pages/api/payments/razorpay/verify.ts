import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../lib/prisma'

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
    
    // Determine billing interval from planType
    let billingInterval = 'monthly'
    let seatsAllowed = 1
    
    if (planType) {
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
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          billingStatus: 'active',
          billingInterval,
          seatsAllowed,
          billingCycleAnchor: new Date(),
          razorpayPlanId: planType
        }
      })
    }

    return res.status(200).json({ ok: true, paymentId: payment.id })
  } catch (err) {
    console.error('Payment verification error:', err)
    return res.status(500).json({ error: 'Failed to process payment' })
  }
}
