-- AlterTable
ALTER TABLE "ModuleSubscription" ADD COLUMN "timeClockToleranceMinutes" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "AbsenceType" ADD COLUMN "countsAgainstHourPool" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TimeClockDayDecision" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "diffMinutes" INTEGER NOT NULL,
    "decisionType" TEXT NOT NULL,
    "absenceId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeClockDayDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourPoolMovement" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "absenceId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,

    CONSTRAINT "HourPoolMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeClockDayDecision_employeeId_date_key" ON "TimeClockDayDecision"("employeeId", "date");

-- CreateIndex
CREATE INDEX "HourPoolMovement_employeeId_date_idx" ON "HourPoolMovement"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "TimeClockDayDecision" ADD CONSTRAINT "TimeClockDayDecision_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockDayDecision" ADD CONSTRAINT "TimeClockDayDecision_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "Absence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockDayDecision" ADD CONSTRAINT "TimeClockDayDecision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourPoolMovement" ADD CONSTRAINT "HourPoolMovement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourPoolMovement" ADD CONSTRAINT "HourPoolMovement_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "Absence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourPoolMovement" ADD CONSTRAINT "HourPoolMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourPoolMovement" ADD CONSTRAINT "HourPoolMovement_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
