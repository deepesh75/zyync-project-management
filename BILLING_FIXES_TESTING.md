# Billing Fixes - Testing & Review Checklist

## Overview
5 critical billing issues have been fixed and deployed:
1. ✅ Payment Fix #1: seatsAllowed hardcoding
2. ✅ Payment Fix #2: userCount data passing  
3. ✅ Issue #3: Webhook renewal notifications
4. ✅ Issue #4: SeatsUsed decrement on invite cancellation
5. ✅ Issue #5: Subscription expiration checks on APIs

---

## Test 1: Seat Allocation (Fixes #1-2)

### What Changed
- **Before**: Users always got 1 seat regardless of purchase
- **After**: Users get exactly the seats they purchased

### Where to Verify
- File: `src/pages/pricing/pro.tsx` - sends `userCount` to verify endpoint
- File: `src/pages/api/payments/razorpay/verify.ts` - uses `userCount` for `seatsAllowed`

### How to Test

#### Step 1: Check Database
```bash
# List organizations and their seat allocations
# Should see seatsAllowed matching purchase amount (e.g., 5 seats for 5-seat plan)
SELECT 
  id,
  name,
  seatsAllowed,
  seatsUsed,
  billingStatus,
  razorpaySubscriptionId
FROM "Organization"
WHERE razorpaySubscriptionId IS NOT NULL
LIMIT 5;
```

#### Step 2: Verify Code Path (Local Testing)
```bash
# Check that pro.tsx includes userCount in request
grep -n "userCount" src/pages/pricing/pro.tsx

# Check that verify.ts extracts and uses it
grep -A2 "let seatsAllowed" src/pages/api/payments/razorpay/verify.ts
```

**Expected Output:**
- `pro.tsx`: Includes `userCount` in request body
- `verify.ts`: Line shows `let seatsAllowed = userCount || 1`

#### Step 3: Production Verification
1. Go to /pricing/pro
2. Select 5 seats
3. Complete payment with test card
4. Check organization in database
5. Verify: `seatsAllowed = 5` (not 1)

### Success Criteria
✅ Purchased seat count = database seatsAllowed
✅ No longer hardcoded to 1

---

## Test 2: Webhook Renewal Notifications (Issue #3)

### What Changed
- When subscription renews via webhook, admins now get email with:
  - Renewal confirmation
  - Plan type
  - Seat count
  - Amount charged
  - Next renewal date

### Where to Verify
- File: `src/lib/subscription-emails.ts` - added `sendSubscriptionRenewedEmail()`
- File: `src/pages/api/webhooks/razorpay.ts` - updated `handleSubscriptionCharged()`

### How to Test

#### Step 1: Check Code Implementation
```bash
# Verify renewal email function exists
grep -n "sendSubscriptionRenewedEmail" src/lib/subscription-emails.ts

# Verify webhook calls it
grep -A20 "async function handleSubscriptionCharged" \
  src/pages/api/webhooks/razorpay.ts | grep -i email
```

**Expected Output:**
- Function exists with proper HTML template
- Webhook imports and calls the function
- Includes org admins fetching

#### Step 2: Simulate Webhook (Local Testing)
```bash
# Test webhook signature generation & handling
# Manually trigger webhook via Razorpay dashboard
# OR simulate with curl:

WEBHOOK_SECRET="your_webhook_secret"
PAYLOAD='{"event":"subscription.charged","payload":{"subscription":{"id":"sub_123","current_start":1712973000,"current_end":1715651400,"plan_id":"pro_5_seats","billing_frequency":"monthly"},"payment":{"id":"pay_123","amount":50000,"currency":"INR","method":"card"}}}'

SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | cut -d' ' -f2)

curl -X POST http://localhost:3000/api/webhooks/razorpay \
  -H "x-razorpay-signature: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
```

#### Step 3: Check Email Logs
```bash
# If using Resend, check their dashboard for sent emails
# Look for: "Subscription Renewed Successfully" subject line
# Verify:
# - Sent to organization admin
# - Contains plan details
# - Includes next renewal date
# - Shows amount charged
```

#### Step 4: Database Check
```bash
# After webhook, verify organization updated
SELECT 
  id,
  name,
  billingStatus,
  currentPeriodStart,
  currentPeriodEnd,
  billingCycleAnchor
FROM "Organization"
WHERE id = 'org_id_here';

# Verify payment created
SELECT 
  id,
  organizationId,
  razorpayPaymentId,
  razorpaySubscriptionId,
  amount,
  status,
  capturedAt
FROM "Payment"
WHERE organizationId = 'org_id_here'
ORDER BY capturedAt DESC
LIMIT 1;
```

### Success Criteria
✅ Organization billingStatus = 'active'
✅ currentPeriodEnd updated to new renewal date
✅ Email sent to all organization admins
✅ Payment record created with correct amount
✅ billingCycleAnchor set (on first renewal)

---

## Test 3: SeatsUsed Decrement (Issue #4)

### What Changed
- When invitations are cancelled: `seatsUsed` is decremented
- When invitations expire: automatically cleaned up and `seatsUsed` is adjusted
- Before: `seatsUsed` only incremented, never decremented → grew indefinitely

### Where to Verify
- File: `src/lib/seats.ts` - added `cleanupExpiredInvitations()`
- File: `src/pages/api/organizations/[id]/invitations/[invitationId].ts` - decrement on DELETE

### How to Test

#### Step 1: Verify Code Changes
```bash
# Check cleanup function exists
grep -n "cleanupExpiredInvitations" src/lib/seats.ts

# Check it's called automatically
grep -B5 -A10 "cleanupExpiredInvitations" src/lib/seats.ts | head -20

# Check invitation cancellation decrements
grep -A10 "req.method === 'DELETE'" \
  src/pages/api/organizations/[id]/invitations/[invitationId].ts | grep -i decrement
```

**Expected Output:**
- `cleanupExpiredInvitations()` function defined
- Called in `checkSeatAvailability()` 
- Invitation DELETE endpoint calls `decrementSeatsUsed()`

#### Step 2: Database Before State
```bash
# Before creating invitations
SELECT id, name, seatsAllowed, seatsUsed 
FROM "Organization" 
WHERE id = 'test_org_id';
```

#### Step 3: Create & Cancel Invitation (Manual Test)
```bash
# 1. Create invitation (seatsUsed should increment)
curl -X POST http://localhost:3000/api/organizations/org_id/invite \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{"email":"test@example.com","role":"member"}'

# Check seats before cancellation
SELECT seatsAllowed, seatsUsed FROM "Organization" WHERE id = 'org_id';
# Expected: seatsUsed = previous + 1

# 2. Cancel the invitation (seatsUsed should decrement)
curl -X DELETE http://localhost:3000/api/organizations/org_id/invitations/invite_id \
  -H "Cookie: your_auth_cookie"

# Check seats after cancellation
SELECT seatsAllowed, seatsUsed FROM "Organization" WHERE id = 'org_id';
# Expected: seatsUsed = back to previous value
```

#### Step 4: Test Expiration Cleanup
```bash
# Create invitation (7-day expiry)
INSERT INTO "Invitation" 
(id, email, "organizationId", role, token, "expiresAt", "createdAt")
VALUES (
  'invite_test_' || gen_random_uuid()::text,
  'old@example.com',
  'org_id',
  'member',
  'token_' || gen_random_uuid()::text,
  NOW() - INTERVAL '8 days',  -- Already expired
  NOW() - INTERVAL '8 days'
);

# Check seatsUsed before cleanup
SELECT seatsAllowed, seatsUsed FROM "Organization" WHERE id = 'org_id';

# Trigger cleanup by calling checkSeatAvailability or making API call
curl -X GET http://localhost:3000/api/organizations/org_id/members \
  -H "Cookie: your_auth_cookie"

# Check seatsUsed after cleanup
SELECT seatsAllowed, seatsUsed FROM "Organization" WHERE id = 'org_id';
# Expected: seatsUsed decreased due to expired invite removal
```

### Success Criteria
✅ Creating invitation increments seatsUsed by 1
✅ Cancelling invitation decrements seatsUsed by 1
✅ seatsUsed never grows indefinitely
✅ Expired invitations auto-cleaned on API calls
✅ seatsUsed stays in sync with: active_members + pending_valid_invites

---

## Test 4: Subscription Expiration Checks (Issue #5)

### What Changed
- Inviting new members now blocked if subscription:
  - ❌ Expired
  - ❌ Past due (even within 7-day grace period for safety)
  - ❌ Canceled
  - ❌ Trial ended
- Uses `canAddUser()` which checks both subscription + seats

### Where to Verify
- File: `src/lib/access-control.ts` - `canAddUser()` function (already existed)
- File: `src/pages/api/organizations/[id]/invite.ts` - now calls it

### How to Test

#### Step 1: Verify Integration
```bash
# Check invite endpoint imports canAddUser
grep -n "canAddUser" src/pages/api/organizations/\[id\]/invite.ts

# Check it's called before invite creation
grep -B2 -A5 "const accessCheck = await canAddUser" \
  src/pages/api/organizations/\[id\]/invite.ts
```

**Expected Output:**
- Import present: `import { canAddUser } from '...'`
- Called early in POST handler
- Returns 403 if not allowed

#### Step 2: Test Expired Subscription Block
```bash
# Set up test organization with expired subscription
UPDATE "Organization"
SET 
  "billingStatus" = 'active',
  "currentPeriodEnd" = NOW() - INTERVAL '1 day'  -- Already expired
WHERE id = 'test_org_id';

# Try to invite (should fail with 403)
curl -X POST http://localhost:3000/api/organizations/test_org_id/invite \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{"email":"user@example.com","role":"member"}'

# Expected Response:
# {
#   "error": "Your subscription has expired. Please renew to continue.",
#   "reason": "subscription_expired",
#   "upgradeRequired": true
# }
```

#### Step 3: Test Past Due Block
```bash
# Set organization to past_due
UPDATE "Organization"
SET 
  "billingStatus" = 'past_due',
  "currentPeriodEnd" = NOW() + INTERVAL '5 days'
WHERE id = 'test_org_id';

# Try to invite (should fail)
curl -X POST http://localhost:3000/api/organizations/test_org_id/invite \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{"email":"user@example.com"}'

# Expected Response:
# {
#   "error": "Payment failed. Please update payment method.",
#   "reason": "payment_failed",
#   "upgradeRequired": true
# }
```

#### Step 4: Test Active Subscription Allows Invite
```bash
# Set organization to active with valid period
UPDATE "Organization"
SET 
  "billingStatus" = 'active',
  "currentPeriodEnd" = NOW() + INTERVAL '30 days',
  seatsAllowed = 5,
  seatsUsed = 1
WHERE id = 'test_org_id';

# Try to invite (should succeed if seats available)
curl -X POST http://localhost:3000/api/organizations/test_org_id/invite \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{"email":"valid@example.com"}'

# Expected Response:
# 201 with invitation object and inviteLink
```

### Success Criteria
✅ Expired subscriptions block new invites (403)
✅ Past due subscriptions block new invites (403)
✅ Canceled subscriptions block new invites (403)
✅ Active subscriptions allow invites (201)
✅ Error includes reason code and upgrade flag
✅ Free/lifetime plans not affected by expiration

---

## Summary Checklist

### ✅ Payment Fixes (Issues #1-2)
- [ ] Database shows correct seatsAllowed for purchases
- [ ] Not hardcoded to 1 anymore
- [ ] Multiple purchases = proportional seat increase
- [ ] Code review: verify userCount used in calculations

### ✅ Renewal Emails (Issue #3)
- [ ] Webhook triggered on test renewal
- [ ] Email sent to org admins
- [ ] Email contains payment receipt details
- [ ] Organization dates updated correctly
- [ ] Payment record created in database

### ✅ Seat Decrement (Issue #4)
- [ ] Create → seatsUsed increments
- [ ] Cancel → seatsUsed decrements
- [ ] Expired → cleaned up automatically
- [ ] seatsUsed never exceeds available capacity
- [ ] Sync stays accurate across operations

### ✅ Expiration Checks (Issue #5)
- [ ] Active subscription allows invites
- [ ] Expired subscription blocks invite (403)
- [ ] Past due blocks invite with grace period info
- [ ] Canceled blocks invite
- [ ] Error message helpful and specific
- [ ] Free plans not affected

---

## Commits to Review

```bash
# Review changes:
git log --oneline -5

# Should show:
# 3ecbb59 fix(billing): integrate subscription expiration checks on API calls
# 62d66b3 fix(seats): decrement seatsUsed when invitations cancelled/expired
# f336602 feat(billing): implement webhook renewal notifications
# 66e2a1c fix(billing): use purchased userCount for seatsAllowed
```

## Git Diff Analysis

```bash
# Review exact changes per commit
git show 66e2a1c  # Payment fixes
git show f336602  # Renewal emails
git show 62d66b3  # Seat decrement
git show 3ecbb59  # Expiration checks

# Or review all 5 commits together
git diff 8b13eee..3ecbb59  # From before all changes to latest
```

---

## Next Steps

Once all 4 tests pass:
- ✅ Confirm on production environment
- ✅ Monitor logs for any errors
- ✅ Check admin dashboard shows updated dates
- ✅ Then proceed with remaining 8 issues

Any failures? Check logs in console and debug accordingly.
