-- AlterTable
ALTER TABLE "Equipment"
  ADD COLUMN "payloadEmployeeField" TEXT NOT NULL DEFAULT 'employeeExternalId',
  ADD COLUMN "payloadTypeField" TEXT NOT NULL DEFAULT 'type',
  ADD COLUMN "payloadTimestampField" TEXT NOT NULL DEFAULT 'timestamp';
