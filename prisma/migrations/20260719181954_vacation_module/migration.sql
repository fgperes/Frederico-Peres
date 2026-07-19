-- AlterTable
ALTER TABLE "AbsenceBalance" ADD COLUMN     "carryOverDays" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "AbsenceType" ADD COLUMN     "isVacation" BOOLEAN NOT NULL DEFAULT false;
