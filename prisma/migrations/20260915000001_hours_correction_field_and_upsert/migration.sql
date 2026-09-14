-- AlterTable
ALTER TABLE "HoursCorrection" ADD COLUMN "field" TEXT NOT NULL DEFAULT 'ACTUAL';
ALTER TABLE "HoursCorrection" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "HoursCorrection" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "HoursCorrection" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Junta correções duplicadas para o mesmo colaborador/dia/lado (só pode
-- acontecer se a funcionalidade já tiver sido usada antes desta migração,
-- já que passa a haver, no máximo, uma correção "ativa" por combinação) —
-- soma os minutos em vez de escolher apenas uma, para não perder ajustes já
-- feitos, e mantém a linha mais recente como a que fica.
WITH ranked AS (
  SELECT id, "employeeId", date, field,
         SUM("minutesDelta") OVER (PARTITION BY "employeeId", date, field) AS total_minutes,
         ROW_NUMBER() OVER (PARTITION BY "employeeId", date, field ORDER BY "createdAt" DESC, id DESC) AS rn
  FROM "HoursCorrection"
)
UPDATE "HoursCorrection" hc
SET "minutesDelta" = ranked.total_minutes
FROM ranked
WHERE hc.id = ranked.id AND ranked.rn = 1;

DELETE FROM "HoursCorrection"
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY "employeeId", date, field ORDER BY "createdAt" DESC, id DESC) AS rn
    FROM "HoursCorrection"
  ) ranked
  WHERE rn > 1
);

-- DropIndex
DROP INDEX IF EXISTS "HoursCorrection_employeeId_date_idx";

-- CreateIndex
CREATE UNIQUE INDEX "HoursCorrection_employeeId_date_field_key" ON "HoursCorrection"("employeeId", "date", "field");
