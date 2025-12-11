import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { prisma } from '../../../lib/prisma'
import { requireOrgAdmin } from '../../../lib/requireOrgAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { orgId, returnUrl } = req.body
  if (!orgId) return res.status(400).json({ error: 'orgId required' })

  // Require requesting user to be admin on this org
  const admin = await requireOrgAdmin(req, res, orgId)
  if (!admin) return // requireOrgAdmin already sent response

  try {
    const org = await prisma.organization.findUnique({ where: { id: orgId } })
    if (!org || !org.stripeCustomerId) return res.status(400).json({ error: 'No stripe customer for org' })

    const session = await stripe.billingPortal.sessions.create({ customer: org.stripeCustomerId, return_url: returnUrl || process.env.NEXTAUTH_URL })
    return res.status(200).json({ url: session.url })
  } catch (err: any) {
    console.error('Billing portal error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
