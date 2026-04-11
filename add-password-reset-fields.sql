-- Add password reset fields to User table
-- Run this SQL directly in Neon SQL Editor: https://console.neon.tech

-- Add the passwordResetToken column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;

-- Add unique constraint on passwordResetToken
ALTER TABLE "User" ADD CONSTRAINT "User_passwordResetToken_key" UNIQUE ("passwordResetToken");

-- Add the passwordResetExpiry column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpiry" TIMESTAMP(3);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'User'
AND column_name IN ('passwordResetToken', 'passwordResetExpiry')
ORDER BY column_name;
