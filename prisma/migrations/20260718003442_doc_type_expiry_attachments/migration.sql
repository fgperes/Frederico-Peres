/*
  Warnings:

  - Added the required column `fileData` to the `EmployeeDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarImage" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "nif" TEXT,
    "idDocument" TEXT,
    "idDocumentType" TEXT,
    "idDocumentExpiry" DATETIME,
    "idDocumentNoExpiry" BOOLEAN NOT NULL DEFAULT false,
    "socialSecurityNo" TEXT,
    "iban" TEXT,
    "birthDate" DATETIME,
    "jobTitle" TEXT NOT NULL,
    "departmentId" TEXT,
    "teamId" TEXT,
    "locationId" TEXT,
    "managerId" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "weeklyHours" REAL NOT NULL DEFAULT 40,
    "availability" TEXT,
    "restrictions" TEXT,
    "shiftPreferences" TEXT,
    "skills" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "hireDate" DATETIME,
    "importLogId" TEXT,
    "maritalStatus" TEXT,
    "dependents" INTEGER NOT NULL DEFAULT 0,
    "fiscalRegion" TEXT NOT NULL DEFAULT 'CONTINENTE',
    "mealAllowanceOverride" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("address", "availability", "birthDate", "createdAt", "departmentId", "dependents", "email", "employmentType", "firstName", "fiscalRegion", "hireDate", "iban", "id", "idDocument", "importLogId", "jobTitle", "lastName", "locationId", "managerId", "maritalStatus", "mealAllowanceOverride", "nif", "phone", "restrictions", "shiftPreferences", "skills", "socialSecurityNo", "status", "teamId", "updatedAt", "userId", "weeklyHours") SELECT "address", "availability", "birthDate", "createdAt", "departmentId", "dependents", "email", "employmentType", "firstName", "fiscalRegion", "hireDate", "iban", "id", "idDocument", "importLogId", "jobTitle", "lastName", "locationId", "managerId", "maritalStatus", "mealAllowanceOverride", "nif", "phone", "restrictions", "shiftPreferences", "skills", "socialSecurityNo", "status", "teamId", "updatedAt", "userId", "weeklyHours" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE UNIQUE INDEX "Employee_nif_key" ON "Employee"("nif");
CREATE TABLE "new_EmployeeDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileData" TEXT NOT NULL,
    "uploadedById" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EmployeeDocument" ("employeeId", "fileName", "id", "name", "type", "uploadedAt") SELECT "employeeId", "fileName", "id", "name", "type", "uploadedAt" FROM "EmployeeDocument";
DROP TABLE "EmployeeDocument";
ALTER TABLE "new_EmployeeDocument" RENAME TO "EmployeeDocument";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
