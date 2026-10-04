-- AlterTable
ALTER TABLE "ContractProfile" ADD COLUMN     "worksWeekends" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ContractProfile" ADD COLUMN     "worksHolidays" BOOLEAN NOT NULL DEFAULT true;
