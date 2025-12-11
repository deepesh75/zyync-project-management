import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { prisma } from '../../../lib/prisma'
import { requireOrgAdmin } from '../../../lib/requireOrgAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { orgId, priceId, successUrl, cancelUrl } = req.body
  if (!orgId || !priceId) return res.status(400).json({ error: 'orgId and priceId required' })

  // Require requesting user to be admin on this org
  const admin = await requireOrgAdmin(req, res, orgId)
  if (!admin) return // requireOrgAdmin already sent response

  try {
    // Create or fetch Stripe customer for organization
    const org = await prisma.organization.findUnique({ where: { id: orgId } })
    let customerId = org?.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { orgId } })
      customerId = customer.id
      await prisma.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customerId } })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      success_url: successUrl || `${process.env.NEXTAUTH_URL}/billing/success`,
      cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/billing/cancel`,
      subscription_data: { metadata: { orgId } }
    })

    return res.status(200).json({ url: session.url, id: session.id })
  } catch (err: any) {
    console.error('Checkout session error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
