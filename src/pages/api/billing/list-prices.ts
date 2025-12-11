import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { requireOrgAdmin } from '../../../lib/requireOrgAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { orgId } = req.query
  if (!orgId || Array.isArray(orgId)) return res.status(400).json({ error: 'orgId required' })

  // Require admin access
  const admin = await requireOrgAdmin(req, res, orgId)
  if (!admin) return // requireOrgAdmin already sent response

  try {
    const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] })

    const mapped = prices.data.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      unit_amount: (p.unit_amount ?? null),
      currency: p.currency,
      recurring: p.recurring ? { interval: p.recurring.interval, interval_count: p.recurring.interval_count } : null,
      product: typeof p.product === 'object' && p.product ? { id: (p.product as any).id, name: (p.product as any).name, description: (p.product as any).description || null } : null,
      active: p.active
    }))

    return res.status(200).json({ prices: mapped })
  } catch (err: any) {
    console.error('List prices error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
