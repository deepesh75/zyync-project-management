import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../../../components/Navbar'
import { useOrganization } from '../../../hooks/useOrganization'
import { useSession } from 'next-auth/react'

export default function OrganizationBilling() {
  const router = useRouter()
  const { id } = router.query
  const { organization, isLoading } = useOrganization(id as string)
  const { data: session } = useSession()

  const [processing, setProcessing] = useState(false)
  const [priceId, setPriceId] = useState('')
  const [prices, setPrices] = useState<Array<any>>([])
  const [useManual, setUseManual] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmType, setConfirmType] = useState<'checkout' | 'portal' | null>(null)

  useEffect(() => {
    if (!organization) return

    async function loadPrices() {
      try {
        const res = await fetch(`/api/billing/list-prices?orgId=${organization.id}`)
        const data = await res.json()
        if (res.ok) {
          setPrices(data.prices || [])
        } else {
          console.warn('Failed to load prices', data.error)
        }
      } catch (err) {
        console.error('Failed to fetch prices', err)
      }
    }

    loadPrices()
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

  async function performCreateCheckout() {
    if (!priceId) return alert('Please select a plan')
    setProcessing(true)
    try {
      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: organization.id, planId: priceId })
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to create checkout session')
        return
      }

      // Redirect to PayPal subscription
      window.location.href = data.url
    } catch (err) {
      console.error(err)
      alert('Failed to create checkout session')
    } finally {
      setProcessing(false)
      setConfirmOpen(false)
      setConfirmType(null)
    }
  }

  async function performOpenPortal() {
    setProcessing(true)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: organization.id })
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to open billing portal')
        return
      }

      window.location.href = data.url
    } catch (err) {
      console.error(err)
      alert('Failed to open billing portal')
    } finally {
      setProcessing(false)
      setConfirmOpen(false)
      setConfirmType(null)
    }
  }

  const selectedPrice = prices.find((p: any) => p.id === priceId)

  return (
    <>
      <Navbar />
      <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <a href={`/organizations/${organization.id}/settings`} style={{ color: '#6366f1', textDecoration: 'none', fontSize: 14 }}>← Back to Settings</a>
        <h1 style={{ marginTop: 16 }}>{organization.name} — Billing</h1>
        <p style={{ color: '#6b7280' }}>Manage subscription, seats and invoices for your organization.</p>

        <section style={{ marginTop: 24, background: 'white', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0 }}>Current</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <strong>Plan:</strong>
              <div style={{ color: '#6b7280' }}>{organization.planId || 'Free / none'}</div>
            </div>
            <div>
              <strong>Seats:</strong>
              <div style={{ color: '#6b7280' }}>{organization.seats || 0}</div>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 24, background: 'white', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0 }}>Change Plan / Subscribe</h3>
          <p style={{ color: '#6b7280' }}>Select a plan below to start your subscription via PayPal.</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
            {prices && prices.length > 0 && !useManual ? (
              <select value={priceId} onChange={(e) => setPriceId(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}>
                <option value="">Select a price</option>
                {prices.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.product?.name || p.nickname || p.id} — {p.unit_amount != null ? new Intl.NumberFormat(undefined, { style: 'currency', currency: p.currency || 'USD' }).format((p.unit_amount/100)) : 'TBD'} {p.recurring ? `/${p.recurring.interval}` : ''}
                  </option>
                ))}
                <option value="manual">Enter priceId manually</option>
              </select>
            ) : (
              <input value={priceId} onChange={(e) => setPriceId(e.target.value)} placeholder="price_..." style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }} />
            )}

            <button onClick={() => { if (priceId === 'manual') { setUseManual(true); setPriceId('') } }} style={{ marginRight: 8, background: 'transparent', border: 'none', cursor: 'pointer' }}> </button>

            <button onClick={() => { setConfirmType('checkout'); setConfirmOpen(true) }} disabled={processing} style={{ padding: '10px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{processing ? 'Starting...' : 'Start Checkout'}</button>
          </div>
          {prices && prices.length === 0 && (
            <div style={{ marginTop: 8, color: '#6b7280' }}>No plans available.</div>
          )}

          {selectedPrice && selectedPrice.product?.description && (
            <div style={{ marginTop: 12, color: '#374151' }}>{selectedPrice.product.description}</div>
          )}
        </section>

        <section style={{ marginTop: 24, background: 'white', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0 }}>Manage Subscription</h3>
          <p style={{ color: '#6b7280' }}>Open PayPal to manage payment methods, invoices and subscriptions.</p>
          <button onClick={() => { setConfirmType('portal'); setConfirmOpen(true) }} disabled={processing} style={{ padding: '10px 16px', background: '#0070ba', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{processing ? 'Opening...' : 'Manage in PayPal'}</button>
        </section>

        <ConfirmationModal
          open={confirmOpen}
          onClose={() => { setConfirmOpen(false); setConfirmType(null) }}
          onConfirm={() => { if (confirmType === 'checkout') performCreateCheckout(); else performOpenPortal() }}
          type={confirmType}
          priceLabel={selectedPrice ? `${selectedPrice.product?.name || ''} ${selectedPrice.unit_amount != null ? new Intl.NumberFormat(undefined, { style: 'currency', currency: selectedPrice.currency || 'USD' }).format((selectedPrice.unit_amount/100)) : ''} ${selectedPrice.recurring ? `/${selectedPrice.recurring.interval}` : ''}` : undefined}
          processing={processing}
        />

      </main>
    </>
  )
}

// Confirmation modal render
function ConfirmationModal({ open, onClose, onConfirm, type, priceLabel, processing }: any) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ width: 480, background: 'white', borderRadius: 8, padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
        <h3 style={{ marginTop: 0 }}>{type === 'checkout' ? 'Confirm Checkout' : 'Open Billing Portal'}</h3>
        <p style={{ color: '#6b7280' }}>{type === 'checkout' ? `You are about to start a subscription for ${priceLabel || 'the selected plan'}. Continue?` : 'You will be redirected to PayPal where you can manage invoices and payment methods.'}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={processing} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white' }}>Cancel</button>
          <button onClick={onConfirm} disabled={processing} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#111827', color: 'white' }}>
            {processing ? (type === 'checkout' ? 'Starting...' : 'Opening...') : (type === 'checkout' ? 'Confirm & Go to Checkout' : 'Open Portal')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook into default exported component via module-scope state closure for simplicity
(function attachModalBehavior() {
  // noop: placeholder to ensure the helper is in the file scope for bundler
})()

// Fetch prices on mount
OrganizationBilling.getInitialProps = async () => ({})
