import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Navbar from '../../components/Navbar'

// Razorpay global type declaration
declare global {
  interface Window {
    Razorpay?: any
  }
}

export default function ProPricing() {
  const { data: session } = useSession()
  const router = useRouter()
  const [userCount, setUserCount] = useState(5)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [loading, setLoading] = useState(false)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)

  const pricePerUserMonthly = 330
  const pricePerUserAnnual = 3000 // ₹3000/year (save 25% vs monthly)
  const pricePerUser = billingCycle === 'monthly' ? pricePerUserMonthly : pricePerUserAnnual
  const subtotal = userCount * pricePerUser
  const discount = 0
  const total = subtotal - discount

  // Load Razorpay Checkout script
  useEffect(() => {
    if (typeof window !== 'undefined' && !razorpayLoaded) {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => setRazorpayLoaded(true)
      document.head.appendChild(script)
    }
  }, [razorpayLoaded])

  const handleSubscribe = async () => {
    if (!session) {
      router.push(`/auth/signup?plan=pro&users=${userCount}&billing=${billingCycle}`)
      return
    }

    if (!razorpayLoaded || typeof window === 'undefined' || !window.Razorpay) {
      alert('Payment system is not ready. Please try again in a moment.')
      return
    }

    setLoading(true)
    try {
      // Get user's organization
      const orgRes = await fetch('/api/organization')
      const orgData = await orgRes.json()
      const organizationId = orgData?.organization?.id

      if (!organizationId) {
        alert('Please create an organization first')
        router.push('/dashboard')
        return
      }

      // Calculate amount in smallest currency unit (paise)
      const amountINR = Math.round(total * 100) // adjust currency conversion if needed
      const planType = `pro_${billingCycle}`
      
      const res = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountINR, currency: 'INR' })
      })
      const order = await res.json()
      if (!order || !order.id) throw new Error('Failed to create order')

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: order.amount,
        currency: order.currency,
        name: 'Zyync',
        description: `Pro plan - ${billingCycle} (${userCount} users)`,
        order_id: order.id,
        handler: async function (response: any) {
          // Verify payment on server
          const verifyRes = await fetch('/api/payments/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...response,
              organizationId,
              planType,
              amount: amountINR
            })
          })
          const result = await verifyRes.json()
          if (result && result.ok) {
            alert('Payment successful — thank you!')
            router.push('/dashboard?payment=success')
          } else {
            alert('Payment verification failed. Please contact support.')
          }
        },
        prefill: {
          name: session.user?.name || '',
          email: session.user?.email || ''
        },
        theme: { color: '#6366f1' }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error('Razorpay error', err)
      alert('There was an error initiating payment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <style jsx>{`
        @media (max-width: 768px) {
          .pricing-header h1 {
            font-size: 24px !important;
          }
          .pricing-header p {
            font-size: 14px !important;
          }
          .plan-config {
            padding: 20px !important;
          }
          .billing-buttons {
            flex-direction: column !important;
          }
          .billing-buttons button {
            padding: 16px 20px !important;
            font-size: 14px !important;
          }
          .billing-buttons button span {
            top: -6px !important;
            right: 4px !important;
          }
          .user-controls {
            justify-content: center !important;
          }
          .pricing-summary {
            font-size: 14px !important;
          }
          .pricing-summary .total {
            font-size: 16px !important;
          }
        }
      `}</style>
      <main style={{ fontFamily: 'inherit', minHeight: 'calc(100vh - 60px)', background: '#f8fafc' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
          {/* Header */}
          <div className="pricing-header" style={{ textAlign: 'center', marginBottom: 40 }}>
            <Link href="/pricing" style={{ color: '#6366f1', textDecoration: 'none', fontSize: 14 }}>
              ← Back to Pricing
            </Link>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: '16px 0', color: '#111827' }}>
              Choose Your Pro Plan
            </h1>
            <p style={{ color: '#6b7280', fontSize: 16 }}>
              Select the number of users and billing cycle that works for your team
            </p>
          </div>

          {/* Plan Configuration */}
          <div className="plan-config" style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 24, color: '#111827' }}>
              Configure Your Plan
            </h2>

            {/* User Count */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                Number of Users
              </label>
              <div className="user-controls" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  onClick={() => setUserCount(Math.max(1, userCount - 1))}
                  style={{
                    width: 40, height: 40, borderRadius: 8, border: '1px solid #d1d5db',
                    background: 'white', cursor: 'pointer', fontSize: 18, fontWeight: 600
                  }}
                >
                  -
                </button>
                <input
                  type="number"
                  value={userCount}
                  onChange={(e) => setUserCount(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: 80, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8,
                    fontSize: 16, fontWeight: 600, textAlign: 'center'
                  }}
                  min="1"
                />
                <button
                  onClick={() => setUserCount(userCount + 1)}
                  style={{
                    width: 40, height: 40, borderRadius: 8, border: '1px solid #d1d5db',
                    background: 'white', cursor: 'pointer', fontSize: 18, fontWeight: 600
                  }}
                >
                  +
                </button>
                <span style={{ fontSize: 16, color: '#6b7280' }}>users</span>
              </div>
            </div>

            {/* Billing Cycle */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                Billing Cycle
              </label>
              <div className="billing-buttons" style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    flex: 1, padding: '12px 24px', borderRadius: 8, border: billingCycle === 'monthly' ? '2px solid #6366f1' : '1px solid #d1d5db',
                    background: billingCycle === 'monthly' ? '#f0f4ff' : 'white', cursor: 'pointer', fontWeight: 600,
                    color: '#374151'
                  }}
                >
                  Monthly - ₹{pricePerUserMonthly}/user/mo
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  style={{
                    flex: 1, padding: '12px 24px', borderRadius: 8, border: billingCycle === 'annual' ? '2px solid #6366f1' : '1px solid #d1d5db',
                    background: billingCycle === 'annual' ? '#f0f4ff' : 'white', cursor: 'pointer', fontWeight: 600,
                    position: 'relative', color: '#374151'
                  }}
                >
                  Annual - ₹{pricePerUserAnnual}/user/yr
                  <span style={{
                    position: 'absolute', top: -8, right: -8, background: '#10b981', color: 'white',
                    padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700
                  }}>
                    Save 25%
                  </span>
                </button>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="pricing-summary" style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 16, color: '#111827' }}>
                Pricing Summary
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>{userCount} users × ₹{pricePerUser}/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {billingCycle === 'annual' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#10b981', fontSize: 14 }}>
                  <span>Annual savings vs monthly</span>
                  <span>-₹{(userCount * pricePerUserMonthly * 12 - subtotal).toFixed(2)}</span>
                </div>
              )}
              <div className="total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                <span>Total {billingCycle === 'monthly' ? 'per month' : 'per year'}</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Razorpay Button */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ maxWidth: 400, margin: '0 auto', width: '100%' }}>
              <button onClick={handleSubscribe} disabled={loading} style={{ padding: '12px 20px', background: '#6366f1', color: 'white', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                {loading ? 'Processing…' : 'Pay with Razorpay'}
              </button>
            </div>
            {!razorpayLoaded && (
              <div style={{ marginTop: 12, color: '#6b7280' }}>Loading payment gateway…</div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}