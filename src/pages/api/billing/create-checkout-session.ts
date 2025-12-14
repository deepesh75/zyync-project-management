import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { requireOrgAdmin } from '../../../lib/requireOrgAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { orgId, planId, successUrl, cancelUrl } = req.body
  if (!orgId || !planId) return res.status(400).json({ error: 'orgId and planId required' })

  // Require requesting user to be admin on this org
  const admin = await requireOrgAdmin(req, res, orgId)
  if (!admin) return // requireOrgAdmin already sent response

  try {
    // Fetch or create PayPal customer for organization
    const org = await prisma.organization.findUnique({ where: { id: orgId } })
    let customerId = org?.paypalCustomerId

    if (!customerId) {
      // For PayPal, we use email as customer identifier
      customerId = `org_${orgId}@paypal.local`
      await prisma.organization.update({ 
        where: { id: orgId }, 
        data: { paypalCustomerId: customerId } 
      })
    }

    // Map plan IDs to PayPal plan IDs (you need to set these in PayPal)
    const planMapping: Record<string, string> = {
      'price_pro_monthly': process.env.PAYPAL_PRO_PLAN_ID || 'P-PLACEHOLDER-PRO',
      'price_enterprise_monthly': process.env.PAYPAL_ENTERPRISE_PLAN_ID || 'P-PLACEHOLDER-ENTERPRISE'
    }

    const paypalPlanId = planMapping[planId] || planId

    // Create subscription link using PayPal subscription URL
    // The actual subscription creation happens when user approves on PayPal's side
    const subscriptionLink = `https://www.paypal.com/billing/plans/${paypalPlanId}/subscribe`

    // In production, you'd create a PayPal approval URL with return URLs
    // For now, we'll return the subscription link
    return res.status(200).json({ 
      url: subscriptionLink,
      type: 'paypal_subscription',
      planId: paypalPlanId
    })
  } catch (err: any) {
    console.error('PayPal checkout session error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
