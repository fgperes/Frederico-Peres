-- AlterTable
ALTER TABLE "AbsenceType" ADD COLUMN "socialSecurityCode" TEXT;
ALTER TABLE "AbsenceType" ADD COLUMN "salaryImpactPercent" DOUBLE PRECISION NOT NULL DEFAULT 100;

-- Alinha o novo campo com o valor já existente de "paid" nos tipos que já
-- existirem (sem isto, um tipo não remunerado ficaria com 100% por omissão).
UPDATE "AbsenceType" SET "salaryImpactPercent" = 0 WHERE "paid" = false;
