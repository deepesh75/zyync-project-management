import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { prisma } from '../../../lib/prisma'

export const config = {
  api: {
    bodyParser: false
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

import { buffer } from 'micro'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature'] as string | undefined
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  let event: Stripe.Event

  try {
    const buf = await buffer(req as any)
    if (!webhookSecret) throw new Error('Missing webhook secret')
    event = stripe.webhooks.constructEvent(buf, sig || '', webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature error', err)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.subscription ? (session.subscription as any).metadata?.orgId : session.metadata?.orgId
        // If subscription created, fetch it and update org
        if (session.subscription && orgId) {
          const subs = await stripe.subscriptions.retrieve(session.subscription as string)
          await prisma.organization.update({ where: { id: orgId }, data: { stripeSubscriptionId: subs.id, stripeCustomerId: String(session.customer) } })
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        // optional: record invoice
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // optional: mark org as past_due, notify
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.orgId
        if (orgId) {
          const seats = subscription.items?.data?.[0]?.quantity || 1
          await prisma.organization.update({ where: { id: orgId }, data: { stripeSubscriptionId: subscription.id, planId: subscription.items?.data?.[0]?.price?.id || undefined, seats } })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.orgId
        if (orgId) {
          await prisma.organization.update({ where: { id: orgId }, data: { stripeSubscriptionId: null } })
        }
        break
      }

      default:
        // console.log(`Unhandled event type ${event.type}`)
    }

    res.json({ received: true })
  } catch (err: any) {
    console.error('Webhook handling error', err)
    res.status(500).end()
  }
}
