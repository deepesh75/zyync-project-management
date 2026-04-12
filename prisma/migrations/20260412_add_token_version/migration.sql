-- Add tokenVersion column for session invalidation support
-- Allows invalidating all active sessions for a user (e.g. on org removal)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
