-- CreateTable
CREATE TABLE "IrsTable" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'CONTINENTE',
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IrsTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IrsTable_year_region_key" ON "IrsTable"("year", "region");

-- Tabela por omissão para acolher os escalões que já existiam (o motor de
-- payroll usava-os como lista única global) — RH pode ajustar o ano/região
-- ou criar tabelas novas em Payroll → Pressupostos.
INSERT INTO "IrsTable" (id, year, region, label, "createdAt", "updatedAt")
VALUES ('irstbl_default', 2026, 'CONTINENTE', 'Tabela por omissão (migrada automaticamente)', now(), now())
ON CONFLICT (id) DO NOTHING;

-- AlterTable
ALTER TABLE "IrsBracket" ADD COLUMN "irsTableId" TEXT;

UPDATE "IrsBracket" SET "irsTableId" = 'irstbl_default' WHERE "irsTableId" IS NULL;

ALTER TABLE "IrsBracket" ALTER COLUMN "irsTableId" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "IrsBracket_order_key";

-- CreateIndex
CREATE UNIQUE INDEX "IrsBracket_irsTableId_order_key" ON "IrsBracket"("irsTableId", "order");

-- AddForeignKey
ALTER TABLE "IrsBracket" ADD CONSTRAINT "IrsBracket_irsTableId_fkey" FOREIGN KEY ("irsTableId") REFERENCES "IrsTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PayslipLayoutSettings" (
    "id" TEXT NOT NULL,
    "documentTitle" TEXT NOT NULL DEFAULT 'Recibo de Vencimento',
    "footerNote" TEXT,
    "lineItemsJson" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "PayslipLayoutSettings_pkey" PRIMARY KEY ("id")
);
