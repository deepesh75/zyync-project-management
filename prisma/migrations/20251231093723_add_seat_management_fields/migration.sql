-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "billingCycleAnchor" TIMESTAMP(3),
ADD COLUMN     "billingStatus" TEXT DEFAULT 'active',
ADD COLUMN     "perSeatPriceCents" INTEGER,
ADD COLUMN     "seatsAllowed" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "seatsUsed" INTEGER NOT NULL DEFAULT 0;
