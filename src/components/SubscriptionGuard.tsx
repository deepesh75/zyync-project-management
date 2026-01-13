import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

interface SubscriptionStatus {
  isReadOnly: boolean
  reason?: string
  message?: string
  canView: boolean
  canEdit: boolean
  canInvite: boolean
  canCreate: boolean
  isGracePeriod?: boolean
  daysRemaining?: number
}

interface SubscriptionGuardProps {
  organizationId: string
  children: React.ReactNode
  requireWrite?: boolean // If true, blocks rendering when read-only
  showBanner?: boolean // If true, shows warning banner
}

export function SubscriptionGuard({ 
  organizationId, 
  children, 
  requireWrite = false,
  showBanner = true 
}: SubscriptionGuardProps) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    fetch(`/api/organizations/${organizationId}/access-status`)
      .then(r => r.json())
      .then(data => {
        setStatus(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch subscription status:', err)
        setLoading(false)
      })
  }, [organizationId])

  if (loading) {
    return (
      <div style={{ 
        padding: 32, 
        textAlign: 'center',
        color: 'var(--text-secondary)' 
      }}>
        Loading...
      </div>
    )
  }

  // No status means allow (personal projects, etc.)
  if (!status) {
    return <>{children}</>
  }

  // Show grace period warning banner
  if (status.isGracePeriod && showBanner) {
    return (
      <>
        <div style={{ 
          padding: 16, 
          background: '#fef3c7', 
          borderBottom: '2px solid #f59e0b',
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <strong>{status.message}</strong>
              {status.daysRemaining && (
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  {status.daysRemaining} {status.daysRemaining === 1 ? 'day' : 'days'} remaining
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => router.push(`/organizations/${organizationId}/billing`)}
            style={{
              padding: '8px 16px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            Update Billing
          </button>
        </div>
        {children}
      </>
    )
  }

  // Show read-only mode blocker
  if (status.isReadOnly && requireWrite) {
    return (
      <div style={{ 
        padding: 48, 
        textAlign: 'center',
        maxWidth: 600,
        margin: '0 auto'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ 
          fontSize: 24, 
          marginBottom: 16,
          color: 'var(--text)'
        }}>
          Read-Only Mode
        </h2>
        <p style={{ 
          fontSize: 16, 
          marginBottom: 8,
          color: 'var(--text-secondary)',
          lineHeight: 1.6
        }}>
          {status.message}
        </p>
        <p style={{ 
          fontSize: 14, 
          marginBottom: 24,
          color: 'var(--text-secondary)'
        }}>
          Your data is safe and preserved. Upgrade to regain full access.
        </p>
        <button 
          onClick={() => router.push('/pricing')}
          style={{
            padding: '12px 32px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 16
          }}
        >
          View Pricing Plans
        </button>
      </div>
    )
  }

  return <>{children}</>
}

// Hook for programmatic access to subscription status
export function useSubscriptionStatus(organizationId: string) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    fetch(`/api/organizations/${organizationId}/access-status`)
      .then(r => r.json())
      .then(data => {
        setStatus(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch subscription status:', err)
        setLoading(false)
      })
  }, [organizationId])

  return { status, loading }
}
