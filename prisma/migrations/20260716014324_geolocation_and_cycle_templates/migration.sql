-- AlterTable
ALTER TABLE "TimeClockEntry" ADD COLUMN "latitude" REAL;
ALTER TABLE "TimeClockEntry" ADD COLUMN "locationAccuracy" REAL;
ALTER TABLE "TimeClockEntry" ADD COLUMN "longitude" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScheduleCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "weeks" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "departmentId" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ScheduleCycle" ("createdAt", "departmentId", "id", "name", "startDate", "weeks") SELECT "createdAt", "departmentId", "id", "name", "startDate", "weeks" FROM "ScheduleCycle";
DROP TABLE "ScheduleCycle";
ALTER TABLE "new_ScheduleCycle" RENAME TO "ScheduleCycle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
