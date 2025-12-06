# Email Setup Guide

This app uses [Resend](https://resend.com) to send invitation emails.

## Setup Steps

### 1. Create a Resend Account (Free)

1. Go to [https://resend.com/signup](https://resend.com/signup)
2. Sign up with your email (no credit card required)
3. Verify your email address

### 2. Get Your API Key

1. Go to [https://resend.com/api-keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Give it a name (e.g., "Zyync Development")
4. Copy the API key (it will only be shown once!)

### 3. Add API Key to .env

Open your `.env` file and add your API key:

```env
RESEND_API_KEY=re_your_api_key_here
```

### 4. Configure Email Sender (Optional)

**For Development/Testing:**
- Use the default: `onboarding@resend.dev`
- No setup required, works immediately
- Limited to 100 emails/day

**For Production:**
1. Add your domain in Resend dashboard
2. Add DNS records to verify domain ownership
3. Update `.env`:
   ```env
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

### 5. Restart Your Dev Server

```bash
npm run dev
```

## Testing Email Invitations

1. Go to Organization Settings
2. Click "Invite Member"
3. Enter an email address
4. Check the email inbox - you should receive a beautiful invitation email!

## Troubleshooting

**Emails not sending?**
- Check that `RESEND_API_KEY` is set in `.env`
- Restart your dev server after adding the API key
- Check the terminal for error messages
- Verify your Resend account is active

**Using a custom domain?**
- Make sure DNS records are properly configured
- Wait a few minutes for DNS propagation
- Test with `onboarding@resend.dev` first

## Free Tier Limits

- ✅ 100 emails per day
- ✅ 3,000 emails per month
- ✅ No credit card required
- ✅ Perfect for small teams and development

## Email Features

The invitation email includes:
- ✨ Beautiful, responsive HTML design
- 🎨 Branded with Zyync colors
- 🔗 One-click accept button
- 📱 Mobile-friendly layout
- 🔒 Secure invitation token
- ⏰ 7-day expiration
