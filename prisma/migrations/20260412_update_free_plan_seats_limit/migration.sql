-- Update Free plan seat limit from 1 to 5
-- Free plan organizations now allow 5 members instead of 1

-- 1. Update the default value for new organizations
ALTER TABLE "Organization" ALTER COLUMN "seatsAllowed" SET DEFAULT 5;

-- 2. Update existing Free plan organizations that have only 1 seat to 5
-- (Only for free plans that haven't been actively modified)
UPDATE "Organization"
SET "seatsAllowed" = 5
WHERE ("planId" = 'free' OR "planId" IS NULL)
  AND "seatsAllowed" = 1
  AND "razorpayCustomerId" IS NULL
  AND "razorpaySubscriptionId" IS NULL;
