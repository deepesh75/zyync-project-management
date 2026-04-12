# Code Changes - Quick Reference

## Issue #1-2: Payment Fix (Commit 66e2a1c)

### What Was Broken
- **Before**: `let seatsAllowed = 1` (hardcoded)
- **After**: `let seatsAllowed = userCount || 1` (dynamic)

### File: src/pages/pricing/pro.tsx
```typescript
// Line ~112: Added userCount to request body
const response = await fetch('/api/payments/razorpay/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...response,
    organizationId,
    planType,
    userCount,        // ← ADDED: Send user's seat selection
    amount: amountINR
  })
})
```

### File: src/pages/api/payments/razorpay/verify.ts
```typescript
// Line ~21: Extract userCount from request
const { 
  razorpay_order_id, 
  razorpay_payment_id, 
  razorpay_signature,
  organizationId,
  planType,
  userCount,        // ← ADDED: New parameter
  amount
} = req.body

// Line ~57: Use userCount instead of hardcoded 1
let billingInterval = 'monthly'
let seatsAllowed = userCount || 1  // ← CHANGED FROM: let seatsAllowed = 1
```

### Test Command
```bash
# Verify the critical line changed
grep "let seatsAllowed = userCount" \
  src/pages/api/payments/razorpay/verify.ts
```

---

## Issue #3: Webhook Renewal (Commit f336602)

### What Was Missing
- No email notification when subscriptions renew
- No confirmation to admins about successful renewal

### File: src/lib/subscription-emails.ts
```typescript
// NEW FUNCTION (lines 1-98): sendSubscriptionRenewedEmail()
export async function sendSubscriptionRenewedEmail(data: {
  toEmail: string
  organizationName: string
  planName: string
  seatsAllowed: number
  amount: number
  currency: string
  renewalDate: string
  nextRenewalDate: string
  billingPageUrl: string
}) {
  // ... beautiful HTML email template with:
  // - Renewal confirmation header
  // - Organization and plan details table
  // - Amount charged and next renewal date
  // - Link to manage billing
}
```

### File: src/pages/api/webhooks/razorpay.ts
```typescript
// Line ~4: Added import
import { sendSubscriptionRenewedEmail } from '../../../lib/subscription-emails'

// Line ~110-180: Updated handleSubscriptionCharged()
async function handleSubscriptionCharged(subscription: any, payment: any) {
  // ... existing code ...
  
  // NEW: Fetch org admins
  const org = await prisma.organization.findFirst({
    where: { razorpaySubscriptionId: subscription.id },
    include: {
      members: {
        where: { role: 'admin' },  // ← NEW: Get admins only
        include: { user: true }
      }
    }
  })
  
  // ... existing update code ...
  
  // NEW: Send renewal emails to all admins
  const billingPageUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/organizations/${org.id}/billing`
  
  for (const member of org.members) {
    try {
      await sendSubscriptionRenewedEmail({
        toEmail: member.user.email,
        organizationName: org.name,
        planName,
        seatsAllowed: org.seatsAllowed,
        amount: payment?.amount || 0,
        currency: payment?.currency || 'INR',
        renewalDate,
        nextRenewalDate,
        billingPageUrl
      })
    } catch (emailErr) {
      console.error(`Failed to send renewal email...`, emailErr)
    }
  }
}
```

### Test Command
```bash
# Verify email function created
grep -c "sendSubscriptionRenewedEmail" src/lib/subscription-emails.ts
# Should return: 1

# Verify webhook calls it
grep -c "sendSubscriptionRenewedEmail" src/pages/api/webhooks/razorpay.ts
# Should return: 1
```

---

## Issue #4: Seat Decrement (Commit 62d66b3)

### What Was Missing
- Invitations created = seatsUsed ↑ (worked)
- Invitations cancelled = seatsUsed ↓ (BROKEN - never decremented)
- Expired invitations = never cleaned (BROKEN - grew indefinitely)

### File: src/lib/seats.ts
```typescript
// NEW FUNCTION (lines 240-282): cleanupExpiredInvitations()
export async function cleanupExpiredInvitations(organizationId?: string): Promise<number> {
  const now = new Date()
  
  // Find all expired invitations that haven't been accepted
  const expiredInvitations = await prisma.invitation.findMany({
    where: {
      acceptedAt: null,
      expiresAt: { lt: now },
      ...(organizationId && { organizationId })
    }
  })
  
  // Delete expired invitations
  await prisma.invitation.deleteMany({...})
  
  // Re-sync seats for each affected organization
  for (const orgId of orgIds) {
    await syncSeatsUsed(orgId)  // ← Recalculate seatsUsed
  }
  
  return expiredInvitations.length
}

// MODIFIED: checkSeatAvailability() (line ~15)
export async function checkSeatAvailability(organizationId: string) {
  // NEW: Clean up expired invites in background
  cleanupExpiredInvitations(organizationId).catch(err => 
    console.warn('Background cleanup failed (non-fatal):', err)
  )
  
  // ... existing code ...
}
```

### File: src/pages/api/organizations/[id]/invitations/[invitationId].ts
```typescript
// Line ~6: Added imports
import { decrementSeatsUsed, syncSeatsUsed } from '../../../../../lib/seats'

// Line ~48-75: Modified DELETE handler
if (req.method === 'DELETE') {
  // Check if invitation is not already accepted
  if (invitation.acceptedAt) {
    return res.status(400).json({ error: 'Cannot cancel an already accepted invitation' })
  }

  await prisma.invitation.delete({
    where: { id: invitationId }
  })

  // NEW: Decrement seats used since we're removing a pending invite
  try {
    await decrementSeatsUsed(id)  // ← CRITICAL FIX
  } catch (err) {
    console.warn('Failed to decrement seats...', err)
  }

  // NEW: Sync seats to ensure accuracy
  try {
    await syncSeatsUsed(id)
  } catch (err) {
    console.warn('Failed to sync seats...', err)
  }
}
```

### Test Command
```bash
# Verify cleanup function added
grep -c "cleanupExpiredInvitations" src/lib/seats.ts
# Should return: 2 (definition + call in checkSeatAvailability)

# Verify decrement in invite delete
grep -c "decrementSeatsUsed" \
  src/pages/api/organizations/\[id\]/invitations/\[invitationId\].ts
# Should return: 1
```

---

## Issue #5: Expiration Checks (Commit 3ecbb59)

### What Was Missing
- No check for subscription expiration before allowing invites
- Expired orgs could still invite users → revenue leakage

### File: src/pages/api/organizations/[id]/invite.ts

**Before**: Only checked seat count
**After**: Checks BOTH subscription status + seat count

```typescript
// Line ~8: Added import
import { canAddUser } from '../../../../lib/access-control'

// Line ~79-92: NEW unified check before invite creation
// Check subscription status AND seat availability using unified check
// canAddUser() handles both subscription expiration and seat limits
const accessCheck = await canAddUser(id)
if (!accessCheck.allowed) {
  return res.status(403).json({
    error: accessCheck.message || 'Cannot invite members at this time',
    reason: accessCheck.reason,
    upgradeRequired: true
  })
}

// Seat availability is already checked above via canAddUser()
// But keep checkSeatAvailability for sync purposes and detailed metrics
const seatCheck = await checkSeatAvailability(id)
```

### What canAddUser() Checks (from access-control.ts)
```typescript
// src/lib/access-control.ts - canAddUser() function
// Checks BOTH:
// 1. Subscription status (expired? canceled? past_due?)
// 2. Seat limit (seatsUsed >= seatsAllowed?)

// Returns 403 if:
// ❌ Subscription expired
// ❌ Subscription past_due (even in grace period - conservative)
// ❌ Subscription canceled
// ❌ Trial ended
// ❌ Seats full (seatsUsed >= seatsAllowed)

// Returns 201 if:
// ✅ Active subscription + seats available
```

### Test Command
```bash
# Verify canAddUser is imported
grep "canAddUser" src/pages/api/organizations/\[id\]/invite.ts

# Verify it's called early in request
grep -A5 "const accessCheck = await canAddUser" \
  src/pages/api/organizations/\[id\]/invite.ts
```

---

## Summary of Line Changes

| Issue | File | Change | Lines |
|-------|------|--------|-------|
| #1-2 | verify.ts | Extract userCount, use for seatsAllowed | 21, 57 |
| #1-2 | pro.tsx | Pass userCount to verify | 112 |
| #3 | subscription-emails.ts | Add sendSubscriptionRenewedEmail() | 1-98 |
| #3 | razorpay.ts | Update handleSubscriptionCharged() | 110-180 |
| #4 | seats.ts | Add cleanupExpiredInvitations() | 240-282 |
| #4 | seats.ts | Call cleanup in checkSeatAvailability() | ~15 |
| #4 | [invitationId].ts | Add decrement on DELETE | 48-75 |
| #5 | invite.ts | Add canAddUser() check | 79-92 |

---

## Files Modified

```
  3 files change, 5 +23, -3 (commit 66e2a1c)
  3 files changed, 176 insertions (+), 4 (commit f336602)
  3 files changed, 72 insertions (+), 1 (commit 62d66b3)
  2 files changed, 15 insertions (+), 2 (commit 3ecbb59)
  ─────────────────────────────────────────
  = 11 files total, 288 insertions (+), 10 deletions (-)
```

All changes are backwards compatible and use existing patterns from the codebase.
