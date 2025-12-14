/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `Organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "paypalCustomerId" TEXT,
ADD COLUMN     "paypalPlanId" TEXT,
ADD COLUMN     "paypalSubscriptionId" TEXT;
