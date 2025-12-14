import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { requireOrgAdmin } from '../../../lib/requireOrgAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { orgId, returnUrl } = req.body
  if (!orgId) return res.status(400).json({ error: 'orgId required' })

  // Require requesting user to be admin on this org
  const admin = await requireOrgAdmin(req, res, orgId)
  if (!admin) return // requireOrgAdmin already sent response

  try {
    const org = await prisma.organization.findUnique({ where: { id: orgId } })
    if (!org || !org.paypalCustomerId) return res.status(400).json({ error: 'No PayPal subscription found' })

    // Direct user to PayPal account management
    const paypalPortalUrl = 'https://www.paypal.com/myaccount/billing'
    return res.status(200).json({ url: paypalPortalUrl })
  } catch (err: any) {
    console.error('Billing portal error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
