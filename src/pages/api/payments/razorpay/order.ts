import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })

  const { amount, currency = 'INR', receipt } = req.body
  if (!amount || typeof amount !== 'number') return res.status(400).json({ error: 'amount is required (in smallest currency unit, e.g., paise)' })

  try {
    const keyId = process.env.RAZORPAY_KEY_ID || ''
    const keySecret = process.env.RAZORPAY_KEY_SECRET || ''

    if (!keyId || !keySecret) {
      console.error('Razorpay credentials missing:', { keyId: keyId ? 'set' : 'missing', keySecret: keySecret ? 'set' : 'missing' })
      return res.status(500).json({ error: 'Razorpay configuration error', details: 'Server credentials not configured' })
    }

    const body = JSON.stringify({ amount, currency, receipt: receipt || `rcpt_${Date.now()}`, payment_capture: 1 })

    console.log('Creating Razorpay order with:', { amount, currency, keyIdPrefix: keyId.substring(0, 10) })

    const resp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64')
      },
      body
    })

    if (!resp.ok) {
      const text = await resp.text()
      console.error('Razorpay order API error:', {
        status: resp.status,
        statusText: resp.statusText,
        body: text,
        requestBody: { amount, currency }
      })
      return res.status(500).json({ 
        error: 'Failed to create order', 
        details: `Razorpay API error: ${resp.status} ${resp.statusText}`,
        razorpayError: text 
      })
    }

    const order = await resp.json()
    console.log('Razorpay order created successfully:', order.id)
    return res.status(201).json(order)
  } catch (err) {
    console.error('Razorpay order create failed:', err)
    return res.status(500).json({ 
      error: 'Failed to create order', 
      details: err instanceof Error ? err.message : 'Unknown error'
    })
  }
}
