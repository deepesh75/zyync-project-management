import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { requireOrgAdmin } from '../../../lib/requireOrgAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    orgId,
    planId,
    userCount,
    billingCycle,
    pricePerUser,
    total,
    isLifetime,
    successUrl,
    cancelUrl
  } = req.body

  if (!planId) return res.status(400).json({ error: 'planId required' })

  // For new signups, orgId might not exist yet
  if (orgId) {
    const admin = await requireOrgAdmin(req, res, orgId)
    if (!admin) return // requireOrgAdmin already sent response
  }

  try {
    // Handle different plan types
    if (planId === 'pro') {
      // Pro plan with user-based pricing
      if (!userCount || !billingCycle) {
        return res.status(400).json({ error: 'userCount and billingCycle required for Pro plan' })
      }

      const paypalPlanId = billingCycle === 'annual'
        ? process.env.PAYPAL_PLAN_PRO_ANNUAL
        : process.env.PAYPAL_PLAN_PRO_MONTHLY

      if (!paypalPlanId) {
        return res.status(500).json({ error: 'PayPal plan not configured' })
      }

      // Create PayPal subscription approval URL
      const approvalUrl = `https://www.paypal.com/billing/plans/${paypalPlanId}/subscribe?quantity=${userCount}`

      return res.status(200).json({
        url: approvalUrl,
        type: 'paypal_subscription',
        planId: paypalPlanId,
        userCount,
        billingCycle
      })

    } else if (planId === 'pro_lifetime') {
      // Lifetime deal - one-time payment
      const paypalProductId = process.env.PAYPAL_PRODUCT_PRO_LIFETIME
      if (!paypalProductId) {
        return res.status(500).json({ error: 'PayPal lifetime product not configured' })
      }

      // Create PayPal one-time payment approval URL
      const approvalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${process.env.PAYPAL_MERCHANT_EMAIL}&item_name=Zyync%20Pro%20Lifetime&item_number=pro_lifetime&amount=199.00&currency_code=USD&return=${encodeURIComponent(successUrl || 'https://zyync.com/success')}&cancel_return=${encodeURIComponent(cancelUrl || 'https://zyync.com/pricing')}`

      return res.status(200).json({
        url: approvalUrl,
        type: 'paypal_onetime',
        amount: 199,
        productId: paypalProductId
      })

    } else if (planId === 'enterprise') {
      // Enterprise - redirect to contact
      return res.status(200).json({
        url: 'mailto:sales@zyync.com?subject=Enterprise%20Inquiry',
        type: 'contact'
      })

    } else {
      // Legacy plan handling
      const planMapping: Record<string, string> = {
        'price_pro_monthly': process.env.PAYPAL_PLAN_PRO_MONTHLY || 'P-PLACEHOLDER-PRO',
        'price_enterprise_monthly': process.env.PAYPAL_PLAN_ENTERPRISE || 'P-PLACEHOLDER-ENTERPRISE'
      }

      const paypalPlanId = planMapping[planId] || planId
      const subscriptionLink = `https://www.paypal.com/billing/plans/${paypalPlanId}/subscribe`

      return res.status(200).json({
        url: subscriptionLink,
        type: 'paypal_subscription',
        planId: paypalPlanId
      })
    }

  } catch (err: any) {
    console.error('PayPal checkout session error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
