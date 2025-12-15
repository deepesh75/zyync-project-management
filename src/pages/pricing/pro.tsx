import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Navbar from '../../components/Navbar'

export default function ProPricing() {
  const { data: session } = useSession()
  const router = useRouter()
  const [userCount, setUserCount] = useState(5)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [loading, setLoading] = useState(false)

  const pricePerUser = billingCycle === 'monthly' ? 4 : 3
  const subtotal = userCount * pricePerUser
  const discount = billingCycle === 'annual' ? subtotal * 0.25 : 0
  const total = subtotal - discount

  const handleSubscribe = async () => {
    if (!session) {
      router.push(`/auth/signup?plan=pro&users=${userCount}&billing=${billingCycle}`)
      return
    }

    setLoading(true)
    try {
      // Redirect to PayPal checkout
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'pro',
          userCount,
          billingCycle,
          pricePerUser,
          total
        })
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Error creating checkout session')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error processing subscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ fontFamily: 'inherit', minHeight: 'calc(100vh - 60px)', background: '#f8fafc' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
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
          <div style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 24, color: '#111827' }}>
              Configure Your Plan
            </h2>

            {/* User Count */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                Number of Users
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    flex: 1, padding: '12px 24px', borderRadius: 8, border: billingCycle === 'monthly' ? '2px solid #6366f1' : '1px solid #d1d5db',
                    background: billingCycle === 'monthly' ? '#f0f4ff' : 'white', cursor: 'pointer', fontWeight: 600
                  }}
                >
                  Monthly - ${4}/user
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  style={{
                    flex: 1, padding: '12px 24px', borderRadius: 8, border: billingCycle === 'annual' ? '2px solid #6366f1' : '1px solid #d1d5db',
                    background: billingCycle === 'annual' ? '#f0f4ff' : 'white', cursor: 'pointer', fontWeight: 600,
                    position: 'relative'
                  }}
                >
                  Annual - ${3}/user
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
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 16, color: '#111827' }}>
                Pricing Summary
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>{userCount} users × ${pricePerUser}/{billingCycle === 'monthly' ? 'month' : 'month (billed annually)'}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#10b981' }}>
                  <span>Annual discount (25%)</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                <span>Total {billingCycle === 'monthly' ? 'per month' : 'per year'}</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Subscribe Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleSubscribe}
              disabled={loading}
              style={{
                padding: '16px 48px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontSize: 18,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              {loading ? 'Processing...' : `Start Pro Plan - $${total.toFixed(2)}/${billingCycle === 'monthly' ? 'month' : 'year'}`}
            </button>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 16 }}>
              14-day free trial • Cancel anytime • Upgrade or downgrade at any time
            </p>
          </div>
        </div>
      </main>
    </>
  )
}