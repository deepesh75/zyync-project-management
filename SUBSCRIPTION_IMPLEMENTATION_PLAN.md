# Subscription Management Implementation Plan

## Current Gaps & Solutions

### 1. Missing Database Fields for Subscription Lifecycle

**Problem:** No way to track when subscriptions expire or renew

**Solution:** Add to Organization model in schema.prisma:
```prisma
model Organization {
  // ... existing fields ...
  
  // Subscription lifecycle tracking
  subscriptionStartedAt DateTime?  // When subscription became active
  currentPeriodStart    DateTime?  // Current billing period start
  currentPeriodEnd      DateTime?  // When subscription expires/renews
  canceledAt            DateTime?  // When user requested cancellation
  cancelAtPeriodEnd     Boolean    @default(false) // Cancel at end vs immediately
}
```

### 2. Access Control Middleware (CRITICAL - COMPLETELY MISSING)

**Problem:** Currently NO enforcement of billing status or expiration. Users with expired/canceled subscriptions can still access everything.

**Solution:** Create centralized middleware

**File:** `src/lib/access-control.ts`
```typescript
import { prisma } from './prisma'

export interface AccessCheckResult {
  allowed: boolean
  reason?: 'subscription_expired' | 'subscription_canceled' | 'payment_failed' | 'trial_ended' | 'seat_limit'
  message?: string
  isGracePeriod?: boolean
  daysRemaining?: number
}

/**
 * Check if organization has active subscription with access rights
 */
export async function checkOrganizationAccess(
  organizationId: string
): Promise<AccessCheckResult> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      billingStatus: true,
      billingInterval: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
      cancelAtPeriodEnd: true,
      seatsAllowed: true,
      seatsUsed: true
    }
  })

  if (!org) {
    return { allowed: false, message: 'Organization not found' }
  }

  const now = new Date()

  // Check 1: Lifetime plan - always allowed
  if (org.billingInterval === 'lifetime') {
    return { allowed: true }
  }

  // Check 2: Trial period
  if (org.billingStatus === 'trialing') {
    if (org.trialEndsAt && org.trialEndsAt > now) {
      const daysRemaining = Math.ceil(
        (org.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      return { 
        allowed: true, 
        isGracePeriod: daysRemaining <= 3,
        daysRemaining 
      }
    } else {
      return { 
        allowed: false, 
        reason: 'trial_ended',
        message: 'Your trial period has ended. Please upgrade to continue.' 
      }
    }
  }

  // Check 3: Canceled subscriptions
  if (org.billingStatus === 'canceled') {
    // If cancel at period end, allow access until period ends
    if (org.cancelAtPeriodEnd && org.currentPeriodEnd && org.currentPeriodEnd > now) {
      const daysRemaining = Math.ceil(
        (org.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      return { 
        allowed: true, 
        isGracePeriod: true,
        daysRemaining,
        reason: 'subscription_canceled'
      }
    } else {
      return { 
        allowed: false, 
        reason: 'subscription_canceled',
        message: 'Your subscription has been canceled. Reactivate to continue.' 
      }
    }
  }

  // Check 4: Past due payments (grace period)
  if (org.billingStatus === 'past_due') {
    // Allow 7-day grace period for past due
    if (org.currentPeriodEnd) {
      const gracePeriodEnd = new Date(org.currentPeriodEnd)
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7)
      
      if (now < gracePeriodEnd) {
        const daysRemaining = Math.ceil(
          (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        return { 
          allowed: true, 
          isGracePeriod: true,
          daysRemaining,
          reason: 'payment_failed',
          message: 'Payment failed. Please update payment method.' 
        }
      }
    }
    
    return { 
      allowed: false, 
      reason: 'payment_failed',
      message: 'Account suspended due to failed payment. Update payment method.' 
    }
  }

  // Check 5: Subscription expired
  if (org.currentPeriodEnd && org.currentPeriodEnd < now) {
    return { 
      allowed: false, 
      reason: 'subscription_expired',
      message: 'Your subscription has expired. Please renew to continue.' 
    }
  }

  // Check 6: Active subscription
  if (org.billingStatus === 'active') {
    return { allowed: true }
  }

  // Default: deny if status unknown
  return { 
    allowed: false, 
    message: 'Unable to verify subscription status' 
  }
}

/**
 * Check if user can be added (combines access + seat checks)
 */
export async function canAddUser(organizationId: string): Promise<AccessCheckResult> {
  // First check if org has active subscription
  const accessCheck = await checkOrganizationAccess(organizationId)
  if (!accessCheck.allowed) {
    return accessCheck
  }

  // Then check seat availability
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      seatsUsed: true,
      seatsAllowed: true
    }
  })

  if (!org) {
    return { allowed: false, message: 'Organization not found' }
  }

  if (org.seatsUsed >= org.seatsAllowed) {
    return {
      allowed: false,
      reason: 'seat_limit',
      message: `Seat limit reached (${org.seatsUsed}/${org.seatsAllowed}). Upgrade to add more users.`
    }
  }

  return { allowed: true }
}

/**
 * Get read-only mode info (when expired but data preserved)
 */
export async function getReadOnlyStatus(organizationId: string) {
  const accessCheck = await checkOrganizationAccess(organizationId)
  
  return {
    isReadOnly: !accessCheck.allowed,
    reason: accessCheck.reason,
    message: accessCheck.message,
    canView: true, // Always allow viewing data
    canEdit: accessCheck.allowed, // Only allow edits if active
    canInvite: accessCheck.allowed,
    canCreate: accessCheck.allowed
  }
}
```

### 3. API Route Protection (MISSING)

**Problem:** API routes don't check subscription status before allowing actions

**Solution:** Add middleware to ALL write operations

**Example for project creation:**
```typescript
// src/pages/api/projects.ts
import { checkOrganizationAccess } from '@/lib/access-control'

// In POST handler:
const accessCheck = await checkOrganizationAccess(organizationId)
if (!accessCheck.allowed) {
  return res.status(403).json({ 
    error: accessCheck.message,
    reason: accessCheck.reason,
    upgradeRequired: true
  })
}
```

### 4. Enhanced Webhook Handlers

**Problem:** Webhooks don't update expiration dates or handle renewals

**Solution:** Update Razorpay webhook handler

**File:** `src/pages/api/webhooks/razorpay.ts`
```typescript
// Add new handler for subscription.charged (renewals)
case 'subscription.charged':
  await handleSubscriptionCharged(event.payload.subscription.entity, event.payload.payment.entity)
  break

async function handleSubscriptionCharged(subscription: any, payment: any) {
  try {
    // Calculate next period end based on interval
    const periodStart = new Date(subscription.current_start * 1000)
    const periodEnd = new Date(subscription.current_end * 1000)
    
    await prisma.organization.updateMany({
      where: { razorpaySubscriptionId: subscription.id },
      data: {
        billingStatus: 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        canceledAt: null,
        cancelAtPeriodEnd: false
      }
    })
    
    // Update payment record
    await prisma.payment.create({
      data: {
        organizationId: org.id,
        razorpayOrderId: payment.order_id,
        razorpayPaymentId: payment.id,
        razorpaySubscriptionId: subscription.id,
        amount: payment.amount,
        currency: payment.currency,
        status: 'captured',
        method: payment.method,
        planType: subscription.plan_id,
        billingInterval: subscription.billing_frequency === 'monthly' ? 'monthly' : 'annual',
        capturedAt: new Date()
      }
    })
    
    console.log('Subscription renewed:', subscription.id)
  } catch (err) {
    console.error('Error handling subscription.charged:', err)
  }
}

// Enhanced cancellation handler
async function handleSubscriptionCancelled(subscription: any) {
  try {
    const periodEnd = subscription.current_end ? new Date(subscription.current_end * 1000) : null
    
    await prisma.organization.updateMany({
      where: { razorpaySubscriptionId: subscription.id },
      data: { 
        billingStatus: 'canceled',
        canceledAt: new Date(),
        cancelAtPeriodEnd: subscription.cancel_at_cycle_end || false,
        currentPeriodEnd: periodEnd // Allow access until period ends
      }
    })
    
    console.log('Subscription cancelled:', subscription.id)
  } catch (err) {
    console.error('Error handling subscription.cancelled:', err)
  }
}
```

### 5. Frontend Access Control Components

**Problem:** UI doesn't show read-only mode or expiration warnings

**Solution:** Create reusable components

**File:** `src/components/SubscriptionGuard.tsx`
```typescript
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

interface SubscriptionGuardProps {
  organizationId: string
  children: React.ReactNode
  requireWrite?: boolean // If true, shows read-only message
}

export function SubscriptionGuard({ 
  organizationId, 
  children, 
  requireWrite = false 
}: SubscriptionGuardProps) {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/organizations/${organizationId}/access-status`)
      .then(r => r.json())
      .then(data => {
        setStatus(data)
        setLoading(false)
      })
  }, [organizationId])

  if (loading) return <div>Loading...</div>

  // Show grace period warning
  if (status.isGracePeriod) {
    return (
      <>
        <div style={{ 
          padding: 16, 
          background: '#fef3c7', 
          borderBottom: '2px solid #f59e0b',
          color: '#92400e'
        }}>
          ⚠️ {status.message} - {status.daysRemaining} days remaining
          <button onClick={() => router.push(`/organizations/${organizationId}/billing`)}>
            Update Billing
          </button>
        </div>
        {children}
      </>
    )
  }

  // Show read-only mode
  if (status.isReadOnly && requireWrite) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h2>🔒 Read-Only Mode</h2>
        <p>{status.message}</p>
        <p>Your data is safe and preserved. Upgrade to regain full access.</p>
        <button onClick={() => router.push('/pricing')}>
          View Pricing Plans
        </button>
      </div>
    )
  }

  return <>{children}</>
}
```

### 6. Data Preservation Strategy

**How data is preserved when subscription expires:**

1. **Never delete data** - All projects, tasks, comments remain in database
2. **Read-only access** - Users can view but not edit/create
3. **Download capability** - Provide export functionality
4. **Reactivation** - Instant access restoration when subscription renewed

**Implementation:**
- `checkOrganizationAccess()` returns `isReadOnly` flag
- UI components disable create/edit buttons
- API routes return 403 for write operations
- GET endpoints continue to work (view data)

### 7. Seat Limit Enforcement (PARTIALLY WORKING)

**Current:** Seat checks only during invitation
**Missing:** Prevent access when seats reduced

**Add to invitation acceptance:**
```typescript
// src/pages/api/invitations/[token]/accept.ts
const accessCheck = await canAddUser(invitation.organizationId)
if (!accessCheck.allowed) {
  return res.status(403).json({ 
    error: 'Cannot accept invitation: ' + accessCheck.message 
  })
}
```

## Implementation Priority

### Phase 1 (CRITICAL - Do First):
1. ✅ Add database fields (currentPeriodEnd, etc.) to schema
2. ✅ Create access-control.ts middleware
3. ✅ Update webhook handlers for renewals
4. ✅ Protect project/task creation APIs

### Phase 2 (Important):
5. ✅ Add SubscriptionGuard component
6. ✅ Create billing status API endpoint
7. ✅ Add grace period notifications
8. ✅ Implement data export functionality

### Phase 3 (Polish):
9. ✅ Add admin dashboard subscription monitoring
10. ✅ Email notifications for expiration
11. ✅ Automated trial conversion
12. ✅ Usage analytics and reporting

## Testing Checklist

- [ ] User with 5 seats cannot invite 6th user
- [ ] Expired subscription shows read-only mode
- [ ] Canceled subscription works until period end
- [ ] Grace period (7 days) allows access during payment issues
- [ ] Lifetime plan never expires
- [ ] Webhook updates currentPeriodEnd correctly
- [ ] Seat reduction prevents new invites
- [ ] Data remains viewable after expiration
- [ ] Reactivation instantly restores access
