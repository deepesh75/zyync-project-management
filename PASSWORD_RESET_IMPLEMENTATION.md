# Forgot Password Implementation

## Overview
A complete password reset flow has been implemented for Zyync, allowing users to securely reset their passwords via email.

## Features Implemented

### 1. API Endpoints

#### `/api/auth/forgot-password` (POST)
- Accepts user email address
- Generates a secure random reset token (32 bytes hex)
- Sets token expiry to 1 hour from request
- Sends password reset email with reset link
- Returns success message (prevents email enumeration)

#### `/api/auth/reset-password` (POST)
- Validates reset token and expiry
- Requires password minimum 8 characters
- Hashes new password with bcrypt
- Updates user password and clears reset token
- Returns success confirmation

### 2. UI Pages

#### `/auth/forgot-password`
- Email input form with validation
- Sends reset request to API
- Shows success/error messages
- Links back to sign-in page
- Fully responsive design with theme support

#### `/auth/reset-password`
- Accepts token from URL query parameter
- Password and confirm password fields
- Client-side password matching validation
- Shows invalid token page if token missing
- Success page with auto-redirect to sign-in
- Fully responsive with theme support

### 3. Email Template
- Professional HTML email design
- Includes reset link button
- Shows expiration time (1 hour)
- Security note for unsolicited requests
- Matches Zyync branding (gradient purple/blue)
- Fully responsive email design

### 4. Database Schema
Schema updated in `prisma/schema.prisma`:
```prisma
model User {
  // ... existing fields
  passwordResetToken  String?   @unique
  passwordResetExpiry DateTime?
  // ... rest of model
}
```

### 5. Sign-In Integration
- Added "Forgot password?" link below password field
- Links to `/auth/forgot-password`
- Maintains existing design consistency

## Database Migration Required

**IMPORTANT:** You need to run the SQL migration in Neon to add the password reset fields to the database.

### Steps:
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Click on "SQL Editor"
4. Run the SQL from `add-password-reset-fields.sql`:

```sql
-- Add the passwordResetToken column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;

-- Add unique constraint on passwordResetToken
ALTER TABLE "User" ADD CONSTRAINT "User_passwordResetToken_key" UNIQUE ("passwordResetToken");

-- Add the passwordResetExpiry column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpiry" TIMESTAMP(3);
```

5. Verify the migration:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'User'
AND column_name IN ('passwordResetToken', 'passwordResetExpiry')
ORDER BY column_name;
```

## User Flow

1. **Request Reset:**
   - User clicks "Forgot password?" on sign-in page
   - Enters email address
   - Receives confirmation message

2. **Email Sent:**
   - User receives email with reset link
   - Link includes secure token
   - Valid for 1 hour

3. **Reset Password:**
   - User clicks link in email
   - Redirected to reset password page
   - Enters new password (min 8 characters)
   - Confirms password matches

4. **Success:**
   - Password updated in database
   - Reset token cleared
   - Auto-redirected to sign-in
   - User can log in with new password

## Security Features

- **Token Generation:** Cryptographically secure random tokens (32 bytes)
- **Token Expiry:** 1-hour time limit on reset links
- **Email Enumeration Prevention:** Same success message whether email exists or not
- **Password Hashing:** bcrypt with salt rounds
- **Token Cleanup:** Reset tokens cleared after successful password change
- **HTTPS Only:** Reset links use NEXTAUTH_URL (production uses HTTPS)

## Environment Variables Used

- `RESEND_API_KEY` - For sending reset emails
- `RESEND_FROM_EMAIL` - Sender email address (do-not-reply@zyync.com)
- `NEXTAUTH_URL` - Base URL for reset links (https://www.zyync.com in production)

## Testing Checklist

- [ ] Run SQL migration in Neon
- [ ] Deploy to production
- [ ] Test forgot password flow with real email
- [ ] Verify reset email is received
- [ ] Click reset link and set new password
- [ ] Confirm can sign in with new password
- [ ] Test expired token (wait 1 hour or manually expire)
- [ ] Test invalid token (random string)
- [ ] Test password validation (< 8 characters)
- [ ] Test password mismatch on confirm

## Files Created/Modified

### Created:
- `src/pages/api/auth/forgot-password.ts` - Forgot password API
- `src/pages/api/auth/reset-password.ts` - Reset password API
- `src/pages/auth/forgot-password.tsx` - Forgot password page
- `src/pages/auth/reset-password.tsx` - Reset password page
- `add-password-reset-fields.sql` - Database migration script
- `PASSWORD_RESET_IMPLEMENTATION.md` - This documentation

### Modified:
- `prisma/schema.prisma` - Added password reset fields to User model
- `src/pages/auth/signin.tsx` - Added "Forgot password?" link

## Notes

- Email template matches the subscription notification email style
- All pages use CSS variables for dark/light mode support
- Error messages are user-friendly and don't expose system details
- Reset tokens are single-use (cleared after successful reset)
- System prevents timing attacks via consistent response times
