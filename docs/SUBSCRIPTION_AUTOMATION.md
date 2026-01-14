# Subscription Management Automation

This document explains the automated subscription expiration monitoring and notification system.

## Overview

The system automatically monitors subscription expiration dates and sends email notifications to organization admins at key intervals:

- **7 days** before expiration - First warning
- **3 days** before expiration - Second warning  
- **1 day** before expiration - Final warning
- **Day of expiration** - Read-only mode notification

## How It Works

### 1. Cron Job Schedule

The system runs daily at **9:00 AM UTC** via Vercel Cron:

```json
{
  "crons": [{
    "path": "/api/cron/check-subscriptions",
    "schedule": "0 9 * * *"
  }]
}
```

### 2. Email Notification Logic

Located in [`src/lib/subscription-emails.ts`](../src/lib/subscription-emails.ts):

- Queries organizations with `currentPeriodEnd` within next 7 days
- Filters for active subscriptions (excludes already-canceled/past_due)
- Calculates exact days remaining
- Sends beautifully formatted HTML emails to all admin users
- Includes direct link to billing page

### 3. Cron Endpoint

Located in [`src/pages/api/cron/check-subscriptions.ts`](../src/pages/api/cron/check-subscriptions.ts):

- Secured with `CRON_SECRET` Bearer token authentication
- Supports both GET (Vercel cron) and POST (manual trigger)
- Returns count of emails sent and details

## Environment Variables

Add to Vercel environment variables:

```bash
CRON_SECRET=zyync_cron_2026_secure_key_a7f9e3c8b2d1f6h4j8k9m3n5p7q2r4s6t8u1v3w5x7y9z1
```

⚠️ **Important**: This secret is used to authenticate cron requests. Keep it secure!

## Testing

### Local Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Run the test script:
   ```bash
   ./scripts/test-cron.sh
   ```

   This will:
   - Read `CRON_SECRET` from `.env`
   - Send authenticated request to local endpoint
   - Display response and email count

### Production Testing

1. Update Vercel environment variables with `CRON_SECRET`

2. Test production endpoint:
   ```bash
   ./scripts/test-cron.sh production
   ```

3. Or manually with curl:
   ```bash
   curl -X POST https://www.zyync.com/api/cron/check-subscriptions \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json"
   ```

## Vercel Deployment

The cron job is automatically configured when you deploy to Vercel:

1. Push changes to main branch
2. Vercel detects `vercel.json` cron configuration
3. Cron job is automatically scheduled
4. Runs daily at 9:00 AM UTC

### Vercel Dashboard

View cron job logs in Vercel:
1. Go to your project dashboard
2. Navigate to "Cron Jobs" tab
3. View execution history and logs

## Manual Trigger

You can manually trigger subscription checks:

### Via API

```bash
curl -X POST https://www.zyync.com/api/cron/check-subscriptions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Response Format

```json
{
  "success": true,
  "emailsSent": 3,
  "details": [
    {
      "organizationId": "org_123",
      "organizationName": "Acme Corp",
      "daysRemaining": 7,
      "recipientCount": 2
    }
  ]
}
```

## Email Templates

### Expiring Soon Email

Sent at 7, 3, and 1 day marks:

- Professional HTML template with gradient header
- Subscription details table
- Days remaining countdown
- Action items checklist
- Direct CTA button to billing page

### Expired Email

Sent when subscription expires:

- Read-only mode notification
- Data preservation assurance
- View-only access explanation
- Reactivation instructions

## Admin Dashboard Monitoring

Admins can view subscription health in real-time:

1. Navigate to Admin Dashboard
2. Click "Subscriptions" tab
3. View:
   - Expiring in 7 days
   - Expiring in 14 days
   - Expiring in 30 days
   - Past due accounts
   - Canceled subscriptions in grace period
   - Total at-risk revenue

## Data Export

Organizations can export all their data before/after expiration:

1. Go to Organization Settings → Billing
2. Scroll to "Data Export" section
3. Click "Export All Data"
4. Receives JSON with all projects, tasks, comments, activities

## Troubleshooting

### Emails not sending

1. Check `RESEND_API_KEY` is set in Vercel
2. Verify `RESEND_FROM_EMAIL` domain is verified in Resend
3. Check cron job logs in Vercel dashboard
4. Manually trigger endpoint to test

### Cron not running

1. Verify `vercel.json` is committed to main branch
2. Check Vercel dashboard → Cron Jobs tab
3. Ensure `CRON_SECRET` is set in Vercel environment
4. Redeploy if needed

### Authentication errors

1. Ensure `CRON_SECRET` matches in `.env` and Vercel
2. Check Bearer token format: `Authorization: Bearer YOUR_SECRET`
3. Verify endpoint URL is correct

## Security Notes

- `CRON_SECRET` must be kept secure and never committed to git
- Only admins receive expiration emails
- Data export requires admin role verification
- All endpoints use NextAuth session authentication

## Monitoring

### What to monitor:

1. **Email delivery rate** - Check Resend dashboard
2. **Cron execution** - Vercel cron logs
3. **Subscription health** - Admin dashboard metrics
4. **Failed renewals** - Past due accounts count

### Alerts to set up:

- Spike in expiring subscriptions
- Cron job failures
- Email delivery failures
- Unusual cancellation rate

## Future Enhancements

Potential improvements:

- [ ] SMS notifications for critical expirations
- [ ] Slack/Discord webhook integrations
- [ ] Custom notification preferences per admin
- [ ] Automated renewal reminder sequences
- [ ] Grace period customization per plan
- [ ] Data export scheduling
