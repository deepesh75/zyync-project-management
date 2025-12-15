import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Navbar from '../../components/Navbar'

// PayPal global type declaration
declare global {
  interface Window {
    paypal?: any
  }
}

export default function ProPricing() {
  const { data: session } = useSession()
  const router = useRouter()
  const [userCount, setUserCount] = useState(5)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [loading, setLoading] = useState(false)
  const [paypalLoaded, setPaypalLoaded] = useState(false)

  const pricePerUser = 4 // Monthly only for now
  const subtotal = userCount * pricePerUser
  const discount = 0 // No discount for monthly
  const total = subtotal - discount

  // Load PayPal SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && !paypalLoaded) {
      const script = document.createElement('script')
      script.src = 'https://www.paypal.com/sdk/js?client-id=Afdwxc772Yiai4tutPAMlm-7y7VSEVEEUXlGlniM2G3tAZSioWwX7M1tOHO-K-LoxiR7VlIca5okFJ1S&vault=true&intent=subscription'
      script.onload = () => setPaypalLoaded(true)
      document.head.appendChild(script)
    }
  }, [paypalLoaded])

  // Render PayPal button when SDK is loaded
  useEffect(() => {
    if (paypalLoaded && window.paypal) {
      // Clear any existing PayPal buttons
      const container = document.getElementById('paypal-button-container')
      if (container) {
        container.innerHTML = ''
      }

      window.paypal.Buttons({
        style: {
          shape: 'pill',
          color: 'blue',
          layout: 'vertical',
          label: 'subscribe'
        },
        createSubscription: function(data: any, actions: any) {
          // Check if user is authenticated first
          if (!session) {
            // Redirect to signup instead of creating subscription
            router.push(`/auth/signup?plan=pro&users=${userCount}&billing=${billingCycle}`)
            return Promise.reject('User not authenticated - redirecting to signup')
          }

          // Check if annual plan is available
          if (billingCycle === 'annual') {
            alert('Annual billing is coming soon! Please select monthly billing for now.')
            return Promise.reject('Annual plan not yet available')
          }

          // Use monthly plan ID
          const planId = 'P-3N8118553R364412BNFAARJA'

          console.log('Creating subscription with:', { planId, quantity: userCount })

          return actions.subscription.create({
            plan_id: planId,
            quantity: userCount
          })
        },
        onApprove: function(data: any, actions: any) {
          // Handle successful subscription
          console.log('Subscription created:', data.subscriptionID)
          alert(`Subscription created successfully! ID: ${data.subscriptionID}`)
          // You can redirect to a success page or update user status here
          router.push('/dashboard?subscription=success')
        },
        onError: function(err: any) {
          console.error('PayPal error:', err)
          // Don't show alert for expected errors (like redirects)
          if (err !== 'User not authenticated - redirecting to signup' && err !== 'Annual plan not yet available') {
            alert('There was an error processing your subscription. Please try again.')
          }
        },
        onCancel: function(data: any) {
          console.log('PayPal payment cancelled by user')
          // Optional: Show a message or redirect
        }
      }).render('#paypal-button-container')
    }
  }, [paypalLoaded, session, userCount, billingCycle]) // Removed router from dependencies

  const handleSubscribe = () => {
    if (!session) {
      router.push(`/auth/signup?plan=pro&users=${userCount}&billing=${billingCycle}`)
      return
    }
    // PayPal button will handle the subscription
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
                    background: billingCycle === 'monthly' ? '#f0f4ff' : 'white', cursor: 'pointer', fontWeight: 600,
                    color: '#374151'
                  }}
                >
                  Monthly - ${4}/user
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  disabled={true}
                  style={{
                    flex: 1, padding: '12px 24px', borderRadius: 8, border: billingCycle === 'annual' ? '2px solid #6366f1' : '1px solid #d1d5db',
                    background: billingCycle === 'annual' ? '#f0f4ff' : '#f5f5f5', cursor: 'not-allowed', fontWeight: 600,
                    position: 'relative', color: '#9ca3af', opacity: 0.6
                  }}
                  title="Annual billing coming soon"
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
                <span>{userCount} users × ${pricePerUser}/month</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                <span>Total per month</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* PayPal Button */}
          <div style={{ textAlign: 'center' }}>
            <div id="paypal-button-container" style={{ maxWidth: 400, margin: '0 auto' }}></div>
            {!paypalLoaded && (
              <div style={{ padding: '20px', color: '#6b7280', fontSize: '14px' }}>
                Loading PayPal...
              </div>
            )}
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 16 }}>
              14-day free trial • Cancel anytime • Upgrade or downgrade at any time
            </p>
          </div>
        </div>
      </main>
    </>
  )
}