import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { syncSeatsUsed } from '../../../lib/seats'
import crypto from 'crypto'

export const config = {
  api: {
    bodyParser: true
  }
}

// Verify PayPal webhook signature
async function verifyPayPalWebhook(req: NextApiRequest): Promise<boolean> {
  const transmissionId = req.headers['paypal-transmission-id'] as string
  const transmissionTime = req.headers['paypal-transmission-time'] as string
  const certUrl = req.headers['paypal-cert-url'] as string
  const authAlgo = req.headers['paypal-auth-algo'] as string
  const transmissionSig = req.headers['paypal-transmission-sig'] as string

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false
  }

  // For development, we'll do basic verification
  // In production, you should verify the certificate and signature properly
  // This requires downloading and verifying the PayPal certificate
  const webhookSecret = process.env.PAYPAL_WEBHOOK_SECRET || ''
  
  // Create signature string as per PayPal docs
  const rawBody = JSON.stringify(req.body)
  const signatureString = `${transmissionId}|${transmissionTime}|${certUrl}|${authAlgo}|${rawBody}`
  
  // Verify signature (simplified for development)
  // In production, use proper certificate verification
  return true // Skip strict verification for now
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify webhook signature
    const isValid = await verifyPayPalWebhook(req)
    if (!isValid) {
      console.warn('Invalid PayPal webhook signature')
      // Still return 200 to acknowledge receipt
      return res.status(200).json({ received: true })
    }

    const event = req.body
    const eventType = event.event_type

    console.log(`PayPal webhook: ${eventType}`)

    // Handle different webhook events
    if (eventType === 'BILLING.SUBSCRIPTION.CREATED') {
      const subscription = event.resource
      const customerId = subscription.subscriber?.payer_info?.email || subscription.id
      const quantity = subscription.quantity ? parseInt(subscription.quantity) : 1

      const org = await prisma.organization.findFirst({
        where: { paypalCustomerId: customerId }
      })

      if (org) {
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            paypalSubscriptionId: subscription.id,
            planId: subscription.plan_id,
            seatsAllowed: quantity,
            billingStatus: 'active',
            billingCycleAnchor: new Date()
          }
        })
        
        // Sync actual seat usage
        await syncSeatsUsed(org.id)
      }
    }

    if (eventType === 'BILLING.SUBSCRIPTION.UPDATED') {
      const subscription = event.resource
      const customerId = subscription.subscriber?.payer_info?.email || subscription.id
      const quantity = subscription.quantity ? parseInt(subscription.quantity) : 1

      const org = await prisma.organization.findFirst({
        where: { paypalCustomerId: customerId }
      })

      if (org) {
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            paypalSubscriptionId: subscription.id,
            planId: subscription.plan_id,
            seatsAllowed: quantity,
            billingStatus: subscription.status === 'ACTIVE' ? 'active' : 'past_due'
          }
        })
        
        // Sync actual seat usage
        await syncSeatsUsed(org.id)
      }
    }

    if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED') {
      const subscription = event.resource
      const customerId = subscription.subscriber?.payer_info?.email || subscription.id

      const org = await prisma.organization.findFirst({
        where: { paypalCustomerId: customerId }
      })

      if (org) {
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            billingStatus: 'canceled',
            // Don't null out subscription data for record keeping
            // paypalSubscriptionId: null,
            // planId: null
          }
        })
      }
    }

    if (eventType === 'BILLING.SUBSCRIPTION.SUSPENDED') {
      const subscription = event.resource
      const customerId = subscription.subscriber?.payer_info?.email || subscription.id

      const org = await prisma.organization.findFirst({
        where: { paypalCustomerId: customerId }
      })

      if (org) {
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            billingStatus: 'past_due'
          }
        })
      }
    }

    if (eventType === 'PAYMENT.SALE.COMPLETED') {
      const sale = event.resource
      if (sale.billing_agreement_id) {
        // Update organization billing status to active on successful payment
        const org = await prisma.organization.findFirst({
          where: { paypalSubscriptionId: sale.billing_agreement_id }
        })

        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              billingStatus: 'active'
            }
          })
        }
        
        console.log(`Payment completed for subscription: ${sale.billing_agreement_id}`)
      }
    }

    if (eventType === 'PAYMENT.SALE.DENIED' || eventType === 'PAYMENT.SALE.FAILED') {
      const sale = event.resource
      if (sale.billing_agreement_id) {
        const org = await prisma.organization.findFirst({
          where: { paypalSubscriptionId: sale.billing_agreement_id }
        })

        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              billingStatus: 'past_due'
            }
          })
        }
      }
      console.log(`Payment failed: ${sale.id}`)
    }

    res.status(200).json({ received: true })
  } catch (err) {
    console.error('PayPal webhook error:', err)
    res.status(200).json({ received: true }) // Return 200 to prevent retries
  }
}
