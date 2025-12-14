import type { NextApiRequest, NextApiResponse } from 'next'
import { requireOrgAdmin } from '../../../lib/requireOrgAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { orgId } = req.query
  if (!orgId || Array.isArray(orgId)) return res.status(400).json({ error: 'orgId required' })

  // Require admin access
  const admin = await requireOrgAdmin(req, res, orgId)
  if (!admin) return // requireOrgAdmin already sent response

  try {
    // Return hardcoded pricing plans (from PayPal)
    // In production, you'd fetch these from PayPal API
    const prices = [
      {
        id: 'price_pro_monthly',
        name: 'Pro',
        amount: 2900, // $29.00
        currency: 'usd',
        interval: 'month',
        description: 'For growing teams',
        features: [
          'Unlimited projects',
          'Unlimited tasks',
          'Up to 10 team members',
          'Email support'
        ]
      },
      {
        id: 'price_enterprise_monthly',
        name: 'Enterprise',
        amount: 9900, // $99.00
        currency: 'usd',
        interval: 'month',
        description: 'For large organizations',
        features: [
          'Everything in Pro',
          'Unlimited team members',
          'Advanced permissions',
          'Priority support'
        ]
      }
    ]

    return res.status(200).json({ prices })
  } catch (err: any) {
    console.error('List prices error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
