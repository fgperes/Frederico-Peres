-- CreateTable
CREATE TABLE "PayrollSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "minimumWage" REAL NOT NULL DEFAULT 870,
    "socialSecurityEmployeeRate" REAL NOT NULL DEFAULT 0.11,
    "socialSecurityEmployerRate" REAL NOT NULL DEFAULT 0.2375,
    "workAccidentInsuranceRate" REAL NOT NULL DEFAULT 0.01,
    "mealAllowanceDaily" REAL NOT NULL DEFAULT 6,
    "mealAllowanceExemptCap" REAL NOT NULL DEFAULT 6,
    "overtimeRateFirstHour" REAL NOT NULL DEFAULT 1.25,
    "overtimeRateAdditional" REAL NOT NULL DEFAULT 1.375,
    "overtimeRateWeekendHoliday" REAL NOT NULL DEFAULT 1.5,
    "workingDaysPerMonth" REAL NOT NULL DEFAULT 22,
    "vacationSubsidyMode" TEXT NOT NULL DEFAULT 'LUMP_SUM_JUNE',
    "christmasSubsidyMode" TEXT NOT NULL DEFAULT 'LUMP_SUM_DECEMBER',
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT
);

-- CreateTable
CREATE TABLE "IrsBracket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL,
    "upToGross" REAL,
    "rate" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "PayrollComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "ssApplicable" BOOLEAN NOT NULL DEFAULT true,
    "applyYear" INTEGER,
    "applyMonth" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollComponent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "baseSalary" REAL NOT NULL,
    "workedHours" REAL NOT NULL,
    "overtimeHours" REAL NOT NULL,
    "overtimePay" REAL NOT NULL,
    "mealAllowanceTotal" REAL NOT NULL,
    "mealAllowanceExempt" REAL NOT NULL,
    "absenceDeductionDays" REAL NOT NULL,
    "absenceDeduction" REAL NOT NULL,
    "otherEarnings" REAL NOT NULL,
    "otherDeductions" REAL NOT NULL,
    "vacationSubsidy" REAL NOT NULL DEFAULT 0,
    "christmasSubsidy" REAL NOT NULL DEFAULT 0,
    "grossTotal" REAL NOT NULL,
    "socialSecurityEmployee" REAL NOT NULL,
    "irsWithholding" REAL NOT NULL,
    "netTotal" REAL NOT NULL,
    "socialSecurityEmployer" REAL NOT NULL,
    "employerCost" REAL NOT NULL,
    "belowMinimumWage" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT,
    CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
INSERT INTO "new_Employee" ("address", "availability", "birthDate", "createdAt", "departmentId", "email", "employmentType", "firstName", "hireDate", "iban", "id", "idDocument", "importLogId", "jobTitle", "lastName", "locationId", "managerId", "nif", "phone", "restrictions", "shiftPreferences", "skills", "socialSecurityNo", "status", "teamId", "updatedAt", "userId", "weeklyHours") SELECT "address", "availability", "birthDate", "createdAt", "departmentId", "email", "employmentType", "firstName", "hireDate", "iban", "id", "idDocument", "importLogId", "jobTitle", "lastName", "locationId", "managerId", "nif", "phone", "restrictions", "shiftPreferences", "skills", "socialSecurityNo", "status", "teamId", "updatedAt", "userId", "weeklyHours" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE UNIQUE INDEX "Employee_nif_key" ON "Employee"("nif");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "IrsBracket_order_key" ON "IrsBracket"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_employeeId_year_month_key" ON "Payslip"("employeeId", "year", "month");
