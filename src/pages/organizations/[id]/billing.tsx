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

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getDaysUntilExpiration = (dateString: string | Date | null | undefined) => {
    if (!dateString) return null
    const expirationDate = new Date(dateString)
    const now = new Date()
    const diffTime = expirationDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysRemaining = getDaysUntilExpiration(organization.currentPeriodEnd)
  const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7

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
      <style jsx>{`
        @media (max-width: 768px) {
          .billing-main {
            padding: 16px !important;
          }
          .plan-overview,
          .seat-management,
          .payment-section {
            padding: 16px !important;
          }
          .billing-grid {
            grid-template-columns: 1fr !important;
          }
          .seat-actions {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .seat-actions input,
          .seat-actions button {
            width: 100% !important;
          }
        }
      `}</style>
      <main className="billing-main" style={{ padding: 24, maxWidth: 900, margin: '0 auto', background: 'var(--bg)', minHeight: 'calc(100vh - 60px)' }}>
        <a href={`/organizations/${organization.id}/settings`} style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 14 }}>← Back to Settings</a>
        <h1 style={{ marginTop: 16, color: 'var(--text)' }}>{organization.name} — Billing & Seats</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your subscription, team seats, and billing settings.</p>

        {/* Current Plan Overview */}
        <section className="plan-overview" style={{ marginTop: 24, background: 'var(--surface)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
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
          
          <div className="billing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Status</div>
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

            {organization.billingInterval !== 'lifetime' && organization.currentPeriodEnd && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  {organization.billingStatus === 'canceled' && organization.cancelAtPeriodEnd 
                    ? 'Access Until' 
                    : 'Renews On'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                  {formatDate(organization.currentPeriodEnd)}
                </div>
                {daysRemaining !== null && daysRemaining > 0 && (
                  <div style={{ 
                    fontSize: 12, 
                    color: isExpiringSoon ? '#dc2626' : 'var(--text-secondary)', 
                    marginTop: 2,
                    fontWeight: isExpiringSoon ? 600 : 400
                  }}>
                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                    {isExpiringSoon && ' ⚠️'}
                  </div>
                )}
              </div>
            )}

            {organization.billingInterval === 'lifetime' && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Plan Type</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>♾️</span> Lifetime Access
                </div>
              </div>
            )}

            {seatInfo && (
              <>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Seats</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                    {seatInfo.seatsUsed} / {seatInfo.seatsAllowed}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {seatInfo.availableSeats} available
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Monthly Cost</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                    {formatCurrency(seatInfo.monthlyCostCents)}
                  </div>
                  {seatInfo.perSeatPriceCents > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {formatCurrency(seatInfo.perSeatPriceCents)}/seat
                    </div>
                  )}
                </div>
              </>
            )}

            {loadingSeats && <div style={{ color: 'var(--text-secondary)' }}>Loading seat info...</div>}
          </div>

          {isExpiringSoon && organization.billingStatus === 'active' && (
            <div style={{ 
              marginTop: 16, 
              padding: 14, 
              borderRadius: 8, 
              background: '#fef3c7', 
              border: '2px solid #f59e0b',
              fontSize: 14,
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Subscription Renewal Approaching</div>
                <div>Your subscription will renew in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}. Please ensure your payment method is up to date.</div>
              </div>
            </div>
          )}

          {organization.billingStatus === 'canceled' && organization.cancelAtPeriodEnd && daysRemaining && daysRemaining > 0 && (
            <div style={{ 
              marginTop: 16, 
              padding: 14, 
              borderRadius: 8, 
              background: '#fef3c7', 
              border: '2px solid #f59e0b',
              fontSize: 14,
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{ fontSize: 20 }}>ℹ️</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Subscription Ending</div>
                <div>Your subscription is canceled and will end in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}. Reactivate to maintain access.</div>
              </div>
            </div>
          )}

          {organization.billingStatus === 'past_due' && (
            <div style={{ 
              marginTop: 16, 
              padding: 14, 
              borderRadius: 8, 
              background: '#fee2e2', 
              border: '2px solid #dc2626',
              fontSize: 14,
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{ fontSize: 20 }}>❌</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Payment Failed</div>
                <div>Your last payment failed. Please update your payment method to avoid service interruption.</div>
              </div>
            </div>
          )}

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
          <section style={{ marginTop: 24, background: 'var(--surface)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ marginTop: 0, fontSize: 18, color: 'var(--text)' }}>Add Team Seats</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '8px 0 16px' }}>
              Add more seats to invite additional team members. You'll be charged {formatCurrency(seatInfo.perSeatPriceCents)}/seat/month.
            </p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: '0 0 150px' }}>
                <label style={{ fontSize: 13, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
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
                    border: '1px solid var(--border)',
                    fontSize: 15,
                    background: 'var(--surface)',
                    color: 'var(--text)'
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Monthly increase</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
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

        {/* Data Export */}
        <section style={{ marginTop: 24, background: 'var(--surface)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18, color: 'var(--text)' }}>Export Organization Data</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '8px 0 16px' }}>
            Download a complete backup of all your organization's projects, tasks, comments, and member data in JSON format.
          </p>
          <button 
            onClick={async () => {
              setProcessing(true)
              try {
                const res = await fetch(`/api/organizations/${organization.id}/export`)
                if (!res.ok) {
                  const error = await res.json()
                  alert(error.error || 'Failed to export data')
                  return
                }
                const data = await res.json()
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${organization.slug}-export-${new Date().toISOString().split('T')[0]}.json`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              } catch (err) {
                console.error(err)
                alert('Failed to export data')
              } finally {
                setProcessing(false)
              }
            }}
            disabled={processing}
            style={{ 
              padding: '12px 24px', 
              background: processing ? 'var(--border)' : 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              cursor: processing ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>{processing ? 'Exporting...' : '📥 Download Data Export'}</span>
          </button>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
            💡 Tip: We recommend exporting your data regularly for backup purposes.
          </div>
        </section>

        {/* Manage Subscription */}
        {planName !== 'Free' && (
          <section style={{ marginTop: 24, background: 'var(--surface)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ marginTop: 0, fontSize: 18, color: 'var(--text)' }}>Manage Subscription</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '8px 0 16px' }}>
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

