-- Add soft delete columns to Task table
ALTER TABLE "Task" 
ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP,
ADD COLUMN "deletedBy" TEXT;

-- Add index for better performance on deleted filter
CREATE INDEX "Task_deleted_idx" ON "Task"("deleted");

-- Add soft delete columns to Project table
ALTER TABLE "Project"
ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP,
ADD COLUMN "deletedBy" TEXT;

CREATE INDEX "Project_deleted_idx" ON "Project"("deleted");

-- Add soft delete columns to Comment table
ALTER TABLE "Comment"
ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP,
ADD COLUMN "deletedBy" TEXT;

CREATE INDEX "Comment_deleted_idx" ON "Comment"("deleted");

-- Add soft delete columns to Label table  
ALTER TABLE "Label"
ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP,
ADD COLUMN "deletedBy" TEXT;

CREATE INDEX "Label_deleted_idx" ON "Label"("deleted");
