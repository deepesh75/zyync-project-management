-- Add tokenVersion field to User table for session invalidation
-- When a user is removed from an organization, increment their tokenVersion
-- This will force them to log out on their next API request

ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Create index for potential future queries
CREATE INDEX "User_tokenVersion_idx" ON "User"("tokenVersion");

-- VERIFICATION:
-- SELECT id, email, "tokenVersion" FROM "User" LIMIT 5;
