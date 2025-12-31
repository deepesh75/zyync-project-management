# Seat Management & Billing System

## Overview

This system enforces team seat limits for organizations and enables customers to purchase additional seats through PayPal subscriptions on a monthly basis.

## Architecture

### Database Schema

New fields added to `Organization` model:

```prisma
model Organization {
  // ... existing fields
  
  // Seat management
  seatsAllowed          Int      @default(1)  // Total seats purchased
  seatsUsed             Int      @default(0)  // Currently occupied (active members + pending invites)
  perSeatPriceCents     Int?                  // Price per additional seat in cents
  
  // Billing status tracking
  billingStatus         String?  @default("active") // "active", "past_due", "canceled", "trialing"
  billingCycleAnchor    DateTime?                    // When the current billing cycle started
}
```

### Core Components

#### 1. Seat Utilities (`src/lib/seats.ts`)

**Functions:**
- `checkSeatAvailability(organizationId)` - Verifies if org has available seats
- `incrementSeatsUsed(organizationId)` - Increments seat count
- `decrementSeatsUsed(organizationId)` - Decrements seat count
- `syncSeatsUsed(organizationId)` - Syncs count with actual members + pending invites
- `getSeatPricing(organizationId)` - Returns pricing information
- `calculateProratedCost(...)` - Calculates prorated cost for mid-cycle changes

#### 2. API Endpoints

**GET `/api/organizations/[id]/seats`**
- Returns seat usage, pricing, and availability
- Requires admin role

**POST `/api/organizations/[id]/seats`**
- Syncs seat count with actual usage
- Requires admin role

**PATCH `/api/organizations/[id]/seats`**
- Updates seatsAllowed (admin override for now)
- In production: should update PayPal subscription quantity
- Requires admin role

#### 3. Enforcement Points

**Invite Creation (`/api/organizations/[id]/invite`)**
- Checks seat availability before creating invitation
- Returns 403 with `upgradeRequired: true` if no seats available
- Increments `seatsUsed` when invitation created

**Invite Acceptance (`/api/invitations/accept`)**
- Syncs seat count after member joins
- Counts actual members + pending invites

**Member Removal (`/api/organizations/[id]/members/[memberId]`)**
- Syncs seat count after member is removed
- Frees up a seat

**Signup (`/api/auth/signup`)**
- New organizations created with:
  - `planId: 'free'`
  - `seatsAllowed: 1`
  - `seatsUsed: 1`
  - `billingStatus: 'active'`

#### 4. PayPal Webhook Updates (`/api/webhooks/paypal`)

Handles these events:

**BILLING.SUBSCRIPTION.CREATED**
- Updates `seatsAllowed` based on subscription `quantity`
- Sets `billingStatus: 'active'`
- Sets `billingCycleAnchor`

**BILLING.SUBSCRIPTION.UPDATED**
- Updates `seatsAllowed` from new quantity
- Updates `billingStatus`

**BILLING.SUBSCRIPTION.CANCELLED**
- Sets `billingStatus: 'canceled'`
- Preserves subscription data for records

**BILLING.SUBSCRIPTION.SUSPENDED**
- Sets `billingStatus: 'past_due'`

**PAYMENT.SALE.COMPLETED**
- Sets `billingStatus: 'active'`

**PAYMENT.SALE.DENIED / FAILED**
- Sets `billingStatus: 'past_due'`

#### 5. Frontend UI

**Billing Page (`/organizations/[id]/billing`)**

Features:
- Current plan overview with seat usage visualization
- Add seats widget with prorated cost calculator
- Upgrade CTA for free plan users
- PayPal subscription management link

**Settings Page (`/organizations/[id]/settings`)**

Enhanced invite flow:
- Shows seat limit error with upgrade prompt
- Redirects to billing page if user confirms upgrade

## User Flows

### Flow 1: New Organization Signup

1. User creates account with organization name
2. Organization created with:
   - Free plan
   - 1 seat allowed
   - 1 seat used (creator)
3. Can invite 0 additional members until upgrade

### Flow 2: Inviting Team Members (With Seats Available)

1. Admin enters email in settings
2. System checks `seatsUsed < seatsAllowed`
3. If yes:
   - Creates invitation
   - Increments `seatsUsed`
   - Sends email
4. When user accepts:
   - Adds to organization
   - Syncs seat count

### Flow 3: Inviting Team Members (No Seats)

1. Admin enters email in settings
2. System checks `seatsUsed < seatsAllowed`
3. If no:
   - Returns error with upgrade flag
   - Shows confirmation dialog: "No seats available. Add more?"
   - Redirects to billing page if confirmed

### Flow 4: Adding Seats (Pro/Enterprise Plans)

1. Admin navigates to billing page
2. Views current usage: e.g., "3 / 5 seats"
3. Selects number of additional seats (e.g., 2)
4. Sees monthly cost increase: e.g., "+$20.00/month"
5. Clicks "Add 2 Seats"
6. Confirms prorated charge
7. **In Production:** Redirects to PayPal to update subscription
8. **For Now:** Seats updated directly (admin override)
9. Webhook updates `seatsAllowed` when PayPal confirms

### Flow 5: Upgrading from Free to Pro

1. Free user clicks "Unlock Pro Features" on billing page
2. Redirects to `/pricing`
3. Selects Pro plan and quantity
4. PayPal checkout flow
5. Webhook sets `seatsAllowed` based on quantity
6. User can now invite team members

### Flow 6: Monthly Billing

1. PayPal charges customer on billing cycle
2. If successful: webhook sets `billingStatus: 'active'`
3. If failed: webhook sets `billingStatus: 'past_due'`
4. Admin sees warning banner (future enhancement)

## Pricing

Default per-seat pricing (defined in `src/lib/seats.ts`):

```typescript
const defaultPricing: Record<string, number> = {
  'free': 0,         // No cost
  'pro': 1000,       // $10/seat/month (in cents)
  'enterprise': 2500 // $25/seat/month (in cents)
}
```

Organizations can have custom `perSeatPriceCents` overrides.

## PayPal Integration

### Current State

- Subscription plans created in PayPal dashboard
- Client-side PayPal SDK integration in `/pricing/pro`
- Webhook signature verification (basic)
- Subscription ID and plan ID stored in database

### Production Requirements

To fully integrate seat quantity updates with PayPal:

1. **Update Subscription Quantity via API**
   ```typescript
   // In /api/organizations/[id]/seats PATCH handler
   const response = await fetch(
     `https://api.paypal.com/v1/billing/subscriptions/${org.paypalSubscriptionId}`,
     {
       method: 'PATCH',
       headers: {
         'Authorization': `Bearer ${accessToken}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         plan: {
           billing_cycles: [{
             pricing_scheme: {
               fixed_price: { 
                 value: newQuantity * pricePerSeat,
                 currency_code: 'USD'
               }
             }
           }]
         }
       })
     }
   )
   ```

2. **Handle Prorated Billing**
   - PayPal may or may not prorate automatically depending on plan settings
   - Alternative: create one-time invoice for prorated amount
   - Update subscription quantity for next billing cycle

3. **Environment Variables**
   ```env
   PAYPAL_CLIENT_ID=your_client_id
   PAYPAL_SECRET=your_secret
   PAYPAL_WEBHOOK_ID=your_webhook_id
   PAYPAL_MODE=sandbox  # or 'live'
   ```

4. **Webhook Security**
   - Implement full certificate verification
   - Use PayPal's SDK for signature validation
   - Store webhook secret securely

## Security Considerations

1. **Server-Side Enforcement**
   - All seat checks happen on server
   - No client-side bypasses possible

2. **Admin-Only Access**
   - Seat management endpoints require admin role
   - Verified via session and database check

3. **Webhook Verification**
   - PayPal signatures validated (basic implementation)
   - TODO: Full certificate chain verification

4. **Data Integrity**
   - Seats synced from actual counts (members + invites)
   - Prevents drift from race conditions

## Testing

### Local Testing

1. **Check Seat Limits**
   ```bash
   # Create org with 1 seat
   # Try to invite 2 people
   # Second should fail with upgrade prompt
   ```

2. **Add Seats**
   ```bash
   curl -X PATCH http://localhost:3000/api/organizations/[id]/seats \
     -H "Content-Type: application/json" \
     -d '{"seatsAllowed": 5}'
   ```

3. **Sync Seats**
   ```bash
   curl -X POST http://localhost:3000/api/organizations/[id]/seats
   ```

### Webhook Testing

Use PayPal's webhook simulator or ngrok:

```bash
# Install Stripe CLI or similar webhook forwarder
npx stripe listen --forward-to localhost:3000/api/webhooks/paypal

# Send test event
curl -X POST http://localhost:3000/api/webhooks/paypal \
  -H "Content-Type: application/json" \
  -d @test-webhook.json
```

## Monitoring

Key metrics to track:

1. **Seat Utilization**
   - Percentage of seats used per org
   - Orgs at/near seat limit

2. **Billing Health**
   - Orgs with `billingStatus: 'past_due'`
   - Failed payment events

3. **Upgrade Conversion**
   - Free → Pro conversion rate
   - Seat purchase frequency

## Future Enhancements

1. **Automatic Seat Scaling**
   - Auto-add seats when limit reached
   - Optional approval workflow

2. **Usage Alerts**
   - Email when 80% of seats used
   - Slack integration for billing events

3. **Seat Transfer**
   - Reassign seats when members leave
   - Pending invites expire and free seats

4. **Team Analytics**
   - Seat usage over time
   - Cost forecasting

5. **Flexible Billing**
   - Annual discounts
   - Volume pricing tiers
   - Custom enterprise contracts

## Troubleshooting

### Issue: Seat count out of sync

**Solution:**
```bash
POST /api/organizations/[id]/seats
```

### Issue: Can't invite even with available seats

**Checks:**
1. Is user an admin?
2. Check `seatsUsed` vs `seatsAllowed` in database
3. Check for expired pending invitations
4. Run seat sync endpoint

### Issue: PayPal webhook not updating seats

**Checks:**
1. Verify webhook URL is correct in PayPal dashboard
2. Check webhook signature verification
3. View webhook logs in PayPal dashboard
4. Check server logs for errors

## Migration Notes

For existing organizations without seat fields:

```sql
-- Set default seats for existing orgs based on current member count
UPDATE "Organization" 
SET 
  "seatsAllowed" = GREATEST(member_count, 1),
  "seatsUsed" = member_count,
  "billingStatus" = 'active'
FROM (
  SELECT 
    "organizationId", 
    COUNT(*) as member_count 
  FROM "OrganizationMember" 
  GROUP BY "organizationId"
) AS counts
WHERE "Organization".id = counts."organizationId";

-- Set free plan orgs to 1 seat
UPDATE "Organization"
SET "seatsAllowed" = 1
WHERE "planId" = 'free' OR "planId" IS NULL;
```

## Support

For questions or issues:
- Check server logs for detailed error messages
- Review PayPal webhook events in dashboard
- Verify database seat counts match actual members + invites
- Contact support with organization ID and error details
