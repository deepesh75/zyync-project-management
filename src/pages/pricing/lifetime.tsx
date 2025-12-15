import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Navbar from '../../components/Navbar'

export default function LifetimePricing() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handlePurchase = async () => {
    if (!session) {
      router.push('/auth/signup?plan=pro_lifetime')
      return
    }

    setLoading(true)
    try {
      // Redirect to PayPal checkout for lifetime deal
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'pro_lifetime',
          price: 199,
          isLifetime: true
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
      alert('Error processing purchase')
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
              Pro Lifetime Deal
            </h1>
            <p style={{ color: '#6b7280', fontSize: 16 }}>
              Get all Pro features forever with a one-time payment
            </p>
          </div>

          {/* Pricing Card */}
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 40,
            boxShadow: '0 20px 40px rgba(99, 102, 241, 0.15)',
            border: '2px solid #6366f1',
            position: 'relative',
            marginBottom: 32
          }}>
            {/* Limited Time Badge */}
            <div style={{
              position: 'absolute',
              top: -12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#ef4444',
              color: 'white',
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              🔥 Limited Time Offer
            </div>

            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 64, fontWeight: 800, color: '#111827', margin: 0 }}>
                $199
              </div>
              <div style={{ color: '#6b7280', fontSize: 16, marginTop: 4 }}>
                One-time payment • Lifetime access
              </div>
            </div>

            {/* Value Proposition */}
            <div style={{ background: '#f0f4ff', borderRadius: 12, padding: 24, marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 16, color: '#111827' }}>
                💰 Incredible Value
              </h3>
              <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>
                <p style={{ margin: 0, marginBottom: 12 }}>
                  <strong>Regular Pro pricing:</strong> $3/user/month = $36/user/year
                </p>
                <p style={{ margin: 0, marginBottom: 12 }}>
                  <strong>With lifetime deal:</strong> Only $199 total (worth $720+ over 2 years)
                </p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#10b981' }}>
                  Save over 80% compared to annual subscriptions!
                </p>
              </div>
            </div>

            {/* Features */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 20, color: '#111827' }}>
                Everything Included:
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  '✅ Unlimited projects',
                  '✅ Unlimited tasks',
                  '✅ All view types (Kanban, Table, Calendar, Timeline)',
                  '✅ Advanced workflow automation',
                  '✅ Unlimited team members',
                  '✅ Priority email support',
                  '✅ Custom task templates',
                  '✅ API access & integrations',
                  '✅ Advanced permissions',
                  '✅ Export capabilities',
                  '✅ Lifetime updates',
                  '✅ No recurring payments'
                ].map((feature, idx) => (
                  <div key={idx} style={{ fontSize: 14, color: '#374151' }}>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Purchase Button */}
            <button
              onClick={handlePurchase}
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px 32px',
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
              {loading ? 'Processing...' : 'Get Lifetime Access - $199'}
            </button>

            <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 16 }}>
              Secure payment via PayPal • Instant access • 30-day money-back guarantee
            </p>
          </div>

          {/* FAQ */}
          <div style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 24, color: '#111827' }}>
              Frequently Asked Questions
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 8, color: '#111827' }}>
                  How many users does this cover?
                </h4>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  The lifetime deal covers unlimited users for your organization. Add as many team members as you need.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 8, color: '#111827' }}>
                  What if I need more features later?
                </h4>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  You can upgrade to Enterprise at any time. The lifetime Pro access remains yours forever.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 8, color: '#111827' }}>
                  Is there a refund policy?
                </h4>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  Yes, 30-day money-back guarantee. If you're not satisfied, contact us for a full refund.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}