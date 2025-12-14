/*
  Warnings:

  - You are about to drop the column `triggerType` on the `Workflow` table. All the data in the column will be lost.
  - You are about to drop the column `triggerValue` on the `Workflow` table. All the data in the column will be lost.
  - Added the required column `triggersJson` to the `Workflow` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Workflow" DROP COLUMN "triggerType",
DROP COLUMN "triggerValue",
ADD COLUMN     "delaySeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "triggersJson" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "WorkflowLog" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "executionId" TEXT,
    "taskId" TEXT,
    "action" TEXT NOT NULL,
    "actionType" TEXT,
    "message" TEXT NOT NULL,
    "resultJson" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowLog_workflowId_idx" ON "WorkflowLog"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowLog_executionId_idx" ON "WorkflowLog"("executionId");

-- CreateIndex
CREATE INDEX "WorkflowLog_taskId_idx" ON "WorkflowLog"("taskId");

-- CreateIndex
CREATE INDEX "WorkflowLog_createdAt_idx" ON "WorkflowLog"("createdAt");

-- AddForeignKey
ALTER TABLE "WorkflowLog" ADD CONSTRAINT "WorkflowLog_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowLog" ADD CONSTRAINT "WorkflowLog_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "WorkflowExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
