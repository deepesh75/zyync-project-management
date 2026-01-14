# Vercel Environment Variable Setup

## Quick Setup Guide

After deploying, you need to add the `CRON_SECRET` to Vercel's environment variables.

### Option 1: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/deepesh75s-projects/zyync-project-management
2. Click on "Settings" tab
3. Click on "Environment Variables" in the left sidebar
4. Add new variable:
   - **Name**: `CRON_SECRET`
   - **Value**: `zyync_cron_2026_secure_key_a7f9e3c8b2d1f6h4j8k9m3n5p7q2r4s6t8u1v3w5x7y9z1`
   - **Environment**: Select all (Production, Preview, Development)
5. Click "Save"
6. Redeploy your application (or it will use the new variable on next deployment)

### Option 2: Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variable
vercel env add CRON_SECRET production
# When prompted, paste: zyync_cron_2026_secure_key_a7f9e3c8b2d1f6h4j8k9m3n5p7q2r4s6t8u1v3w5x7y9z1

# Also add for preview and development
vercel env add CRON_SECRET preview
vercel env add CRON_SECRET development
```

## Verify Cron Job Setup

After deployment, verify the cron job is scheduled:

1. Go to your project on Vercel
2. Navigate to "Cron Jobs" tab
3. You should see:
   - **Path**: `/api/cron/check-subscriptions`
   - **Schedule**: `0 9 * * *` (Daily at 9:00 AM UTC)
   - **Status**: Active

## Test the Cron Job

### Test Immediately (Manual Trigger)

```bash
# From project root
./scripts/test-cron.sh production
```

Expected response:
```json
{
  "success": true,
  "emailsSent": 0,
  "details": []
}
```

Note: `emailsSent: 0` is normal if no subscriptions are expiring in the next 7 days.

### Create Test Subscription for Verification

To test with actual emails, you can:

1. Go to Admin Dashboard
2. Find an organization
3. Manually update their `currentPeriodEnd` in database to 6 days from now
4. Trigger the cron job
5. Check that admin users receive the email

SQL to create test expiring subscription:
```sql
UPDATE "Organization" 
SET "currentPeriodEnd" = NOW() + INTERVAL '6 days'
WHERE id = 'your-test-org-id';
```

## Monitor Cron Execution

### Vercel Logs

1. Go to Vercel Dashboard → Your Project
2. Click "Cron Jobs" tab
3. View execution history with timestamps and results

### Check Email Delivery

1. Go to https://resend.com/emails
2. Filter by "do-not-reply@zyync.com"
3. View sent emails and delivery status

## Troubleshooting

### Cron job not showing in Vercel

- Ensure `vercel.json` is committed to main branch
- Redeploy the application
- Check Vercel build logs for errors

### Cron job fails with 401 Unauthorized

- Verify `CRON_SECRET` is set in Vercel environment variables
- Ensure the secret matches exactly (no extra spaces)
- Redeploy after adding the variable

### Emails not sending

1. Check Resend API key is valid
2. Verify sender domain is verified in Resend
3. Check cron execution logs in Vercel
4. Test the endpoint manually with curl

### Check Current Configuration

```bash
# View current Vercel environment variables
vercel env ls

# Pull environment variables to local .env
vercel env pull
```

## Next Steps After Setup

1. ✅ Verify cron job appears in Vercel dashboard
2. ✅ Test manual trigger with production endpoint
3. ✅ Create a test expiring subscription
4. ✅ Verify email delivery in Resend
5. ✅ Monitor first automated execution (wait for 9 AM UTC)
6. ✅ Check admin dashboard subscription health metrics

## Security Reminders

- Never commit `CRON_SECRET` to git
- Rotate secret if compromised
- Monitor cron execution logs regularly
- Set up alerts for failed executions
