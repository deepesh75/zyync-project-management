import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

export const config = {
  api: {
    bodyParser: false
  }
}

async function buffer(readable: any) {
  const chunks: Uint8Array[] = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const buf = await buffer(req)
  const sig = req.headers['x-razorpay-signature'] as string || ''
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || ''
  const expected = crypto.createHmac('sha256', secret).update(buf).digest('hex')

  if (sig !== expected) {
    console.warn('Invalid Razorpay webhook signature')
    return res.status(400).json({ ok: false })
  }

  try {
    const event = JSON.parse(buf.toString())
    console.log('Razorpay webhook event:', event.event)
    // TODO: handle events like payment.captured, payment.failed, subscription.charged
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Failed to parse webhook', err)
    return res.status(500).json({ ok: false })
  }
}
