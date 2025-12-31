import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../../../components/Navbar'
import { useOrganization } from '../../../hooks/useOrganization'
import { useSession } from 'next-auth/react'

interface SeatInfo {
  seatsAllowed: number
  seatsUsed: number
  perSeatPriceCents: number
  availableSeats: number
  monthlyCostCents: number
}

export default function OrganizationBilling() {
  const router = useRouter()
  const { id } = router.query
  const { organization, isLoading } = useOrganization(id as string)
  const { data: session } = useSession()

  const [processing, setProcessing] = useState(false)
  const [seatInfo, setSeatInfo] = useState<SeatInfo | null>(null)
  const [loadingSeats, setLoadingSeats] = useState(true)
  const [additionalSeats, setAdditionalSeats] = useState(1)

  // Load seat information
  useEffect(() => {
    if (!organization) return

    async function loadSeats() {
      try {
        const res = await fetch(`/api/organizations/${organization.id}/seats`)
        const data = await res.json()
        if (res.ok) {
          setSeatInfo(data)
        } else {
          console.warn('Failed to load seat info', data.error)
        }
      } catch (err) {
        console.error('Failed to fetch seat info', err)
      } finally {
        setLoadingSeats(false)
      }
    }

    loadSeats()
  }, [organization])

  if (isLoading) return <div style={{ padding: 24 }}>Loading...</div>

  if (!organization) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 24 }}>Organization not found</div>
      </>
    )
  }

  const userMembership = organization.members.find((m: any) => m.user.email === session?.user?.email)
  const isAdmin = userMembership?.role === 'admin'

  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <main style={{ padding: 24 }}>
          <h2>Billing</h2>
          <p>You must be an organization admin to manage billing.</p>
        </main>
      </>
    )
  }

  const planName = organization.planId?.includes('P-') 
    ? 'Pro' 
    : organization.planId === 'enterprise' 
      ? 'Enterprise' 
      : 'Free'

  const billingStatusColor = 
    organization.billingStatus === 'active' ? '#10b981' :
    organization.billingStatus === 'past_due' ? '#f59e0b' :
    organization.billingStatus === 'canceled' ? '#ef4444' : '#6b7280'

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(cents / 100)
  }

  const calculateProratedCost = () => {
    if (!seatInfo) return 0
    // Simplified: charge for full month per additional seat
    return additionalSeats * seatInfo.perSeatPriceCents
  }

  async function handleAddSeats() {
    if (additionalSeats < 1) {
      alert('Please select at least 1 additional seat')
      return
    }

    const confirmed = window.confirm(
      `You are about to add ${additionalSeats} seat(s) for ${formatCurrency(calculateProratedCost())}/month.\n\n` +
      `This will increase your monthly bill. Continue?`
    )

    if (!confirmed) return

    setProcessing(true)
    try {
      // In production, this should redirect to PayPal checkout to update subscription
      // For now, we'll update the seats directly (admin override)
      const newSeatsAllowed = (seatInfo?.seatsAllowed || 1) + additionalSeats

      const res = await fetch(`/api/organizations/${organization.id}/seats`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatsAllowed: newSeatsAllowed })
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to update seats')
        return
      }

      alert(`Successfully added ${additionalSeats} seat(s)!\n\nNote: In production, this will be processed through PayPal and charged to your subscription.`)
      
      // Reload seat info
      const seatRes = await fetch(`/api/organizations/${organization.id}/seats`)
      const seatData = await seatRes.json()
      if (seatRes.ok) {
        setSeatInfo(seatData)
      }
      
      setAdditionalSeats(1)
    } catch (err) {
      console.error(err)
      alert('Failed to add seats')
    } finally {
      setProcessing(false)
    }
  }

  async function handleManagePayPal() {
    window.open('https://www.paypal.com/myaccount/autopay/', '_blank')
  }

  return (
    <>
      <Navbar />
      <main style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <a href={`/organizations/${organization.id}/settings`} style={{ color: '#6366f1', textDecoration: 'none', fontSize: 14 }}>← Back to Settings</a>
        <h1 style={{ marginTop: 16 }}>{organization.name} — Billing & Seats</h1>
        <p style={{ color: '#6b7280' }}>Manage your subscription, team seats, and billing settings.</p>

        {/* Current Plan Overview */}
        <section style={{ marginTop: 24, background: 'white', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            Current Plan
            <span style={{ 
              padding: '4px 12px', 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 600,
              background: planName === 'Pro' ? '#eef2ff' : planName === 'Enterprise' ? '#fef3c7' : '#f3f4f6',
              color: planName === 'Pro' ? '#4f46e5' : planName === 'Enterprise' ? '#d97706' : '#6b7280'
            }}>
              {planName}
            </span>
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Status</div>
              <div style={{ 
                fontSize: 15, 
                fontWeight: 600,
                color: billingStatusColor,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  background: billingStatusColor,
                  display: 'inline-block'
                }}></span>
                {organization.billingStatus || 'Active'}
              </div>
            </div>

            {seatInfo && (
              <>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Seats</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
                    {seatInfo.seatsUsed} / {seatInfo.seatsAllowed}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {seatInfo.availableSeats} available
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Monthly Cost</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
                    {formatCurrency(seatInfo.monthlyCostCents)}
                  </div>
                  {seatInfo.perSeatPriceCents > 0 && (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {formatCurrency(seatInfo.perSeatPriceCents)}/seat
                    </div>
                  )}
                </div>
              </>
            )}

            {loadingSeats && <div style={{ color: '#6b7280' }}>Loading seat info...</div>}
          </div>

          {seatInfo && seatInfo.availableSeats === 0 && (
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              borderRadius: 8, 
              background: '#fef3c7', 
              border: '1px solid #fde68a',
              fontSize: 14,
              color: '#92400e'
            }}>
              ⚠️ All seats are in use. Add more seats to invite additional members.
            </div>
          )}
        </section>

        {/* Add Seats */}
        {planName !== 'Free' && seatInfo && (
          <section style={{ marginTop: 24, background: 'white', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Add Team Seats</h2>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '8px 0 16px' }}>
              Add more seats to invite additional team members. You'll be charged {formatCurrency(seatInfo.perSeatPriceCents)}/seat/month.
            </p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: '0 0 150px' }}>
                <label style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Additional Seats
                </label>
                <input 
                  type="number" 
                  min="1" 
                  value={additionalSeats}
                  onChange={(e) => setAdditionalSeats(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ 
                    width: '100%',
                    padding: '10px 12px', 
                    borderRadius: 8, 
                    border: '1px solid #d1d5db',
                    fontSize: 15
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Monthly increase</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
                  +{formatCurrency(calculateProratedCost())}
                </div>
              </div>

              <button 
                onClick={handleAddSeats}
                disabled={processing || additionalSeats < 1}
                style={{ 
                  padding: '12px 24px', 
                  background: '#4f46e5', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 8, 
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  opacity: processing ? 0.6 : 1
                }}
              >
                {processing ? 'Processing...' : `Add ${additionalSeats} Seat${additionalSeats > 1 ? 's' : ''}`}
              </button>
            </div>

            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              borderRadius: 8, 
              background: '#f0f9ff', 
              border: '1px solid #bfdbfe',
              fontSize: 13,
              color: '#1e40af'
            }}>
              💡 In production, this will redirect to PayPal to update your subscription quantity. Changes are prorated to your billing cycle.
            </div>
          </section>
        )}

        {/* Upgrade CTA for Free Plan */}
        {planName === 'Free' && (
          <section style={{ marginTop: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 32, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', color: 'white', textAlign: 'center' }}>
            <h2 style={{ marginTop: 0, fontSize: 24, color: 'white' }}>Unlock Pro Features</h2>
            <p style={{ fontSize: 16, margin: '12px 0 24px', opacity: 0.95 }}>
              Get unlimited seats, advanced features, and priority support with our Pro plan.
            </p>
            <button 
              onClick={() => router.push('/pricing')}
              style={{ 
                padding: '14px 32px', 
                background: 'white', 
                color: '#667eea', 
                border: 'none', 
                borderRadius: 8, 
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              View Plans & Pricing
            </button>
          </section>
        )}

        {/* Manage Subscription */}
        {planName !== 'Free' && (
          <section style={{ marginTop: 24, background: 'white', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Manage Subscription</h2>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '8px 0 16px' }}>
              Update payment methods, view invoices, and manage your subscription in PayPal.
            </p>
            <button 
              onClick={handleManagePayPal}
              style={{ 
                padding: '12px 24px', 
                background: '#0070ba', 
                color: 'white', 
                border: 'none', 
                borderRadius: 8, 
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              Open PayPal Billing
            </button>
          </section>
        )}

      </main>
    </>
  )
}

// Fetch on mount
OrganizationBilling.getInitialProps = async () => ({})

