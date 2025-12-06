/*
  Warnings:

  - Added the required column `projectId` to the `Label` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Label" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "Label_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Label" ("color", "id", "name") SELECT "color", "id", "name" FROM "Label";
DROP TABLE "Label";
ALTER TABLE "new_Label" RENAME TO "Label";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
