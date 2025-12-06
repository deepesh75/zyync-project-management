-- CreateTable
CREATE TABLE "TaskMember" (
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("taskId", "userId"),
    CONSTRAINT "TaskMember_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
