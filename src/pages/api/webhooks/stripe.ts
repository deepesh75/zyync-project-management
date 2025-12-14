import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Stripe webhook handler deprecated - migrated to PayPal
  // See /api/webhooks/paypal.ts for current webhook handling
  
  if (req.method !== 'POST') return res.status(405).end()
  
  // Accept the request to prevent errors from Stripe retry logic
  // But don't process anything
  res.status(200).json({ received: true, deprecated: 'Stripe webhooks no longer processed. Using PayPal instead.' })
}
