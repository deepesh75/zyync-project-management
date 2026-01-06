import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const secret = process.env.RAZORPAY_KEY_SECRET || ''
  const hmac = crypto.createHmac('sha256', secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex')

  if (hmac === razorpay_signature) {
    // TODO: persist payment record, update subscription/order status, trigger webhooks
    return res.status(200).json({ ok: true })
  }

  return res.status(400).json({ error: 'Invalid signature' })
}
