# Deployment Guide for Zyync

## Prerequisites
- Vercel account
- PostgreSQL database (Vercel Postgres recommended)

## Step-by-Step Deployment

### 1. Deploy to Vercel
```bash
npx vercel
```

### 2. Set Up PostgreSQL Database

**Option A: Vercel Postgres (Recommended)**
1. Go to your Vercel project dashboard
2. Navigate to "Storage" tab
3. Click "Create Database" → "Postgres"
4. Copy the `DATABASE_URL` connection string
5. It will be automatically added to your environment variables

**Option B: External Provider (Supabase/Neon/Railway)**
1. Create a PostgreSQL database on your chosen provider
2. Copy the connection string
3. Add it to Vercel environment variables

### 3. Configure Environment Variables

Go to your Vercel project → Settings → Environment Variables and add:

```env
DATABASE_URL=your_postgres_connection_string
NEXTAUTH_SECRET=Wg/GJyI8dFsm13WOTeiG74Sie77ahywtUMFvCb6i0iQ=
NEXTAUTH_URL=https://your-app.vercel.app
RESEND_API_KEY=re_BJKUCi9K_JW4TAQFTdmpyDmPPCvdYqUXE
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Important**: 
- `NEXTAUTH_URL` will be auto-set by Vercel if you don't add it
- Generate a new `NEXTAUTH_SECRET` for production using: `openssl rand -base64 32`

### 4. Run Database Migrations

After deployment, run migrations in Vercel:

1. Go to your project → Settings → Functions
2. Add a build command override in `package.json`:
   ```json
   "scripts": {
     "vercel-build": "prisma generate && prisma migrate deploy && next build"
   }
   ```

Or run manually via Vercel CLI:
```bash
vercel env pull .env.production
npx prisma migrate deploy
```

### 5. Verify Deployment

1. Visit your deployed app URL
2. Create an account
3. Test email invitations
4. Create projects and tasks

## Post-Deployment

### Continuous Deployment
- Every push to `main` branch will automatically deploy via GitHub Actions
- The CI/CD pipeline is already configured in `.github/workflows/`

### Required Secrets for GitHub Actions
If using the deploy workflow, add these secrets to GitHub:
- `VERCEL_TOKEN` - Get from Vercel account settings
- `VERCEL_ORG_ID` - Get from Vercel project settings
- `VERCEL_PROJECT_ID` - Get from Vercel project settings

## Troubleshooting

### Build Errors
- Check Vercel build logs
- Ensure all environment variables are set
- Verify PostgreSQL connection string is correct

### Database Issues
- Run `npx prisma studio` locally to inspect data
- Check Vercel logs for database connection errors
- Ensure PostgreSQL allows connections from Vercel

### Email Issues
- Verify Resend API key is correct
- Check Resend dashboard for delivery status
- Ensure sender email is verified in Resend

## Production Checklist
- ✅ PostgreSQL database configured
- ✅ Environment variables set
- ✅ Database migrations run
- ✅ NEXTAUTH_SECRET is secure and unique
- ✅ Email service tested
- ✅ Custom domain configured (optional)
- ✅ SSL certificate active (automatic with Vercel)
