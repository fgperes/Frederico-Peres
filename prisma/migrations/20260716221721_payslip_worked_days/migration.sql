-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payslip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "baseSalary" REAL NOT NULL,
    "workedHours" REAL NOT NULL,
    "workedDays" REAL NOT NULL DEFAULT 0,
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
INSERT INTO "new_Payslip" ("absenceDeduction", "absenceDeductionDays", "baseSalary", "belowMinimumWage", "christmasSubsidy", "employeeId", "employerCost", "generatedAt", "generatedById", "grossTotal", "id", "irsWithholding", "mealAllowanceExempt", "mealAllowanceTotal", "month", "netTotal", "otherDeductions", "otherEarnings", "overtimeHours", "overtimePay", "socialSecurityEmployee", "socialSecurityEmployer", "vacationSubsidy", "workedHours", "year") SELECT "absenceDeduction", "absenceDeductionDays", "baseSalary", "belowMinimumWage", "christmasSubsidy", "employeeId", "employerCost", "generatedAt", "generatedById", "grossTotal", "id", "irsWithholding", "mealAllowanceExempt", "mealAllowanceTotal", "month", "netTotal", "otherDeductions", "otherEarnings", "overtimeHours", "overtimePay", "socialSecurityEmployee", "socialSecurityEmployer", "vacationSubsidy", "workedHours", "year" FROM "Payslip";
DROP TABLE "Payslip";
ALTER TABLE "new_Payslip" RENAME TO "Payslip";
CREATE UNIQUE INDEX "Payslip_employeeId_year_month_key" ON "Payslip"("employeeId", "year", "month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
