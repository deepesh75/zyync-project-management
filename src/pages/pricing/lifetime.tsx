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
          price: 16500,
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
      <style jsx>{`
        @media (max-width: 768px) {
          .lifetime-header h1 {
            font-size: 24px !important;
          }
          .lifetime-header p {
            font-size: 14px !important;
          }
          .pricing-card {
            padding: 24px !important;
          }
          .price {
            font-size: 48px !important;
          }
          .features-grid {
            grid-template-columns: 1fr !important;
          }
          .value-box {
            padding: 16px !important;
          }
          .faq-section {
            padding: 20px !important;
          }
        }
      `}</style>
      <main style={{ fontFamily: 'inherit', minHeight: 'calc(100vh - 60px)', background: '#f8fafc' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
          {/* Header */}
          <div className="lifetime-header" style={{ textAlign: 'center', marginBottom: 40 }}>
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
          <div className="pricing-card" style={{
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
              <div className="price" style={{ fontSize: 64, fontWeight: 800, color: '#111827', margin: 0 }}>
                ₹16,500
              </div>
              <div style={{ color: '#6b7280', fontSize: 16, marginTop: 4 }}>
                One-time payment • Up to 10 users • Lifetime access
              </div>
            </div>

            {/* Value Proposition */}
            <div className="value-box" style={{ background: '#f0f4ff', borderRadius: 12, padding: 24, marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 16, color: '#111827' }}>
                💰 Incredible Value
              </h3>
              <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>
                <p style={{ margin: 0, marginBottom: 12 }}>
                  <strong>Regular Pro pricing:</strong> ₹330/user/month × 10 users = ₹3,300/month (₹39,600/year)
                </p>
                <p style={{ margin: 0, marginBottom: 12 }}>
                  <strong>With lifetime deal:</strong> Only ₹16,500 total for up to 10 users (worth ₹1,98,000+ over 5 years)
                </p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#10b981' }}>
                  Save over 90% compared to subscriptions!
                </p>
              </div>
            </div>

            {/* Features */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 20, color: '#111827' }}>
                Everything Included:
              </h3>
              <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  '✅ Unlimited projects',
                  '✅ Unlimited tasks',
                  '✅ All view types (Kanban, Table, Calendar, Timeline)',
                  '✅ Advanced workflow automation',
                  '✅ Up to 10 team members',
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
            {!session ? (
              <button
                onClick={() => router.push('/auth/signup?plan=pro_lifetime')}
                style={{
                  width: '100%',
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                Create an account to purchase
              </button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">
                  <input type="hidden" name="cmd" value="_s-xclick" />
                  <input type="hidden" name="hosted_button_id" value="ULGAXDGFUDEG2" />
                  <input type="hidden" name="currency_code" value="INR" />
                  <input
                    type="image"
                    src="https://www.paypalobjects.com/en_US/i/btn/btn_buynowCC_LG.gif"
                    name="submit"
                    title="PayPal - The safer, easier way to pay online!"
                    alt="Buy Now"
                    style={{ border: 0 }}
                  />
                </form>
              </div>
            )}

            <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 16 }}>
              Secure payment via PayPal • Instant access • 30-day money-back guarantee
            </p>
          </div>

          {/* FAQ */}
          <div className="faq-section" style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 24, color: '#111827' }}>
              Frequently Asked Questions
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 8, color: '#111827' }}>
                  How many users does this cover?
                </h4>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  The lifetime deal covers up to 10 users. If you need more than 10 users, you'll need to subscribe to our monthly (₹330/user/month) or annual (₹3000/user/year) plans.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 8, color: '#111827' }}>
                  What if I need more than 10 users?
                </h4>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  For teams larger than 10 users, please choose our Pro Monthly or Pro Annual plans from the pricing page. These plans support unlimited users with flexible scaling.
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