-- AlterTable: Employee ganha os dados fiscais que o payroll precisa de ir
-- buscar — regime de IRS Jovem, beneficiário ADSE, desconto judicial e
-- modo de pagamento dos subsídios de férias/Natal (quando difere da
-- definição global em PayrollSettings).
ALTER TABLE "Employee" ADD COLUMN     "youngTaxRegime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "youngTaxRegimeStartYear" INTEGER,
ADD COLUMN     "adseBeneficiary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "judicialDeductionPercent" DOUBLE PRECISION,
ADD COLUMN     "vacationSubsidyMode" TEXT,
ADD COLUMN     "vacationSubsidyMonths" TEXT,
ADD COLUMN     "christmasSubsidyMode" TEXT,
ADD COLUMN     "christmasSubsidyMonths" TEXT;

-- AlterTable: PayrollSettings ganha a forma de pagamento do subsídio de
-- alimentação (define o limite diário de isenção fiscal a aplicar) e a
-- taxa de desconto ADSE do trabalhador.
ALTER TABLE "PayrollSettings" ADD COLUMN     "mealAllowancePaymentMethod" TEXT NOT NULL DEFAULT 'CARD',
ADD COLUMN     "adseEmployeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.035;

-- AlterTable: DocumentBrandingSettings ganha os dados fiscais da empresa
-- necessários no cabeçalho do recibo de vencimento.
ALTER TABLE "DocumentBrandingSettings" ADD COLUMN     "companyNif" TEXT,
ADD COLUMN     "companyAddress" TEXT,
ADD COLUMN     "companySocialSecurityNo" TEXT;

-- AlterTable: IrsTable passa a distinguir também pela tabela (I/II/III,
-- conforme estado civil/dependentes) — linhas existentes assumem "I"
-- (comportamento anterior, uma só tabela por ano+região).
ALTER TABLE "IrsTable" ADD COLUMN     "tableType" TEXT NOT NULL DEFAULT 'I';

DROP INDEX "IrsTable_year_region_key";

CREATE UNIQUE INDEX "IrsTable_year_region_tableType_key" ON "IrsTable"("year", "region", "tableType");

-- AlterTable: IrsBracket ganha a parcela a abater (fixa ou por fórmula
-- dinâmica, nos escalões baixos) e o acréscimo por dependente, para
-- igualar a fórmula oficial de retenção na fonte.
ALTER TABLE "IrsBracket" ADD COLUMN     "deduction" DOUBLE PRECISION,
ADD COLUMN     "deductionCoefficient" DOUBLE PRECISION,
ADD COLUMN     "deductionThreshold" DOUBLE PRECISION,
ADD COLUMN     "dependentAddition" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable: percentagem de isenção do IRS Jovem por "ano de
-- rendimentos" desde o início do regime — por período, tal como as
-- tabelas de IRS normais.
CREATE TABLE "IrsYoungExemption" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "yearOfBenefit" INTEGER NOT NULL,
    "exemptionPercent" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "IrsYoungExemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IrsYoungExemption_year_yearOfBenefit_key" ON "IrsYoungExemption"("year", "yearOfBenefit");

-- CreateTable: constantes fiscais anuais (IAS e limites de isenção do
-- subsídio de alimentação) que não pertencem a nenhuma tabela de IRS.
CREATE TABLE "FiscalYearConstants" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "ias" DOUBLE PRECISION NOT NULL,
    "mealAllowanceExemptCardDaily" DOUBLE PRECISION NOT NULL DEFAULT 10.46,
    "mealAllowanceExemptCashDaily" DOUBLE PRECISION NOT NULL DEFAULT 6.15,
    "youngExemptionCapAnnualMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 55,
    "youngExemptionCapPaymentsPerYear" DOUBLE PRECISION NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalYearConstants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FiscalYearConstants_year_key" ON "FiscalYearConstants"("year");

-- AlterTable: Payslip ganha os descontos de ADSE e judicial como linhas
-- próprias (até agora só existia o balde genérico "otherDeductions").
ALTER TABLE "Payslip" ADD COLUMN     "adseDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "judicialDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0;
