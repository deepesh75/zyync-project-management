# Issue #13: Access Restriction on Expiration (Not Downgrade)

## Overview
When a subscription expires, instead of destructively downgrading the organization, we now restrict access to the dashboard while preserving all data and users. This allows organizations to quickly restore access by making a payment without losing their team structure.

## Implementation

### 1. Access Restriction Library (`src/lib/access-restriction.ts`)
New utility functions:
- `markExpiredOrganizationsAsRestricted()` - Mark expired orgs (called by cron)
- `restoreOrganizationAccess()` - Restore access on payment
- `getAccessRestrictionInfo()` - Get restriction details

### 2. Payment Restriction Banner (`src/components/PaymentRestrictionBanner.tsx`)
UI component that displays:
- Red/amber warning banner based on days overdue
- Organization name and expiration date
- What users can/cannot do
- "Renew Subscription" CTA button
- Days overdue indicator

### 3. Access Check Middleware (`src/middleware/access-check.ts`)
Helper for server components to check access and get restriction info.

### 4. Cron Job Endpoint (`src/api/cron/check-expired-subscriptions.ts`)
Periodic endpoint to mark expired orgs as `access_restricted`:
- Call hourly via cloud provider cron
- Requires `CRON_SECRET` environment variable
- Returns count of restricted organizations

### 5. Webhook Integration
Updated `handleSubscriptionCharged()` to:
- Restore access when subscription renews
- Set `billingStatus` = 'active'
- Non-fatal error handling

## Database Changes
New status: `access_restricted`
- Billing status added to Organization model (already existed)
- Reuses existing `currentPeriodEnd` field

## User Experience

### When Subscription Expires:
1. **Immediately**: Status remains whatever it was (active, past_due, etc)
2. **Within 1 hour**: Cron job marks org as `access_restricted`
3. **Dashboard Load**: Banner appears showing expiration details
4. **Content**: Data is visible but read-only (grayed out)
5. **Actions Blocked**: Cannot create, edit, or invite

### When Payment is Made:
1. Webhook renews subscription
2. Status restored to `active`
3. Access immediately restored
4. No data was lost

## Permissions Preserved

When restricted:
```
canViewData: true        ✅ See all projects/tasks
canEdit: false           ❌ Cannot modify anything
canInvite: false         ❌ Cannot add users
canCreate: false         ❌ Cannot create new items
canDelete: false         ❌ Cannot delete anything
```

## Configuration

### Environment Variables
```bash
# Required for cron endpoint
CRON_SECRET=your-secret-key-here
```

### Cron Setup
Call this endpoint hourly:
```
GET https://yourapp.com/api/cron/check-expired-subscriptions?key=CRON_SECRET
```

**Vercel**: Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/check-expired-subscriptions?key=$CRON_SECRET",
    "schedule": "0 * * * *"
  }]
}
```

**Other Providers**: Set up via AWS Lambda, GCP Cloud Scheduler, etc.

## Integration Points

### 1. Dashboard Pages
Add to layout or individual pages:
```tsx
import { PaymentRestrictionBanner } from '@/components/PaymentRestrictionBanner'
import { getAccessRestrictionInfo } from '@/lib/access-restriction'

export default async function DashboardPage({ params }) {
  const restrictionInfo = await getAccessRestrictionInfo(params.id)
  
  return (
    <>
      {restrictionInfo?.isRestricted && (
        <PaymentRestrictionBanner
          organizationId={params.id}
          organizationName={restrictionInfo.organizationName}
          expiredDate={restrictionInfo.expiredDate}
          daysOverdue={restrictionInfo.daysOverdue}
        />
      )}
      {/* Rest of page */}
    </>
  )
}
```

### 2. API Endpoints
Protect creation/modification:
```tsx
// In API route
const accessCheck = await checkOrganizationAccess(orgId)
if (!accessCheck.allowed) {
  return res.status(403).json({ error: 'Access restricted' })
}
```

### 3. Client-Side Disable
Disable buttons/forms for read-only state:
```tsx
const restrictionInfo = await getAccessRestrictionInfo(orgId)

return (
  <button disabled={restrictionInfo?.isRestricted}>
    Create Task
  </button>
)
```

## Testing

### Test Restriction
1. Create test org with expired `currentPeriodEnd`
2. Call cron endpoint manually
3. Check org has `access_restricted` status
4. Load dashboard - verify banner appears

### Test Restoration
1. Update org `currentPeriodEnd` to future date
2. Trigger webhook or call `restoreOrganizationAccess()`
3. Verify status returns to `active`
4. Banner should disappear

### Test Permissions
1. Try to create project while restricted - should fail
2. Try to delete user while restricted - should fail  
3. Try to view data while restricted - should succeed

## Data Preservation

✅ **Not Lost**:
- Projects and tasks preserved
- User accounts preserved
- Team members remain in org
- All data intact

✅ **Preserved**:
- Organization ID and metadata
- Payment history and invoices
- User access rights

## Migration from Previous Implementation

If any orgs were downgraded to Free:
```sql
-- Restore restricted orgs
UPDATE "Organization"
SET "billingStatus" = 'access_restricted'
WHERE "planId" = 'free' AND "razorpaySubscriptionId" IS NOT NULL;
```

## Success Criteria

✅ Organizations no longer see Free plan downgrades  
✅ Expired orgs show clear warning banner  
✅ Data remains viewable but non-editable  
✅ Access restored immediately on payment  
✅ No data loss or user removal  
✅ Seamless payment retry experience  

## Files Modified
- `src/lib/access-restriction.ts` (NEW)
- `src/components/PaymentRestrictionBanner.tsx` (NEW)
- `src/middleware/access-check.ts` (NEW)
- `src/pages/api/cron/check-expired-subscriptions.ts` (NEW)
- `src/pages/api/webhooks/razorpay.ts` (UPDATED)

## Commits
- Issue #13 implementation commit
