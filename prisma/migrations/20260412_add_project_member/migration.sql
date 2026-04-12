-- CreateTable: ProjectMember (was missing from production DB)
CREATE TABLE IF NOT EXISTS "ProjectMember" (
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("projectId", "userId"),
  CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectMember_userId_idx" ON "ProjectMember"("userId");
