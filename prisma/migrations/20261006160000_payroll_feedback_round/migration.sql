-- AlterTable: Employee — subsídio de alimentação passa a ser definido só
-- em PayrollSettings (igual para toda a empresa), sem exceção por
-- colaborador.
ALTER TABLE "Employee" DROP COLUMN "mealAllowanceOverride";

-- AlterTable: EmployeeContract ganha o conteúdo real do documento
-- contratual (até agora só guardava o nome do ficheiro, sem upload).
ALTER TABLE "EmployeeContract" ADD COLUMN     "documentData" TEXT;

-- AlterTable: Payslip ganha o detalhe (nome/tipo/valor/categoria) de cada
-- rubrica variável no momento da geração, para o recibo mostrar cada uma
-- separadamente em vez de um "Outros vencimentos/descontos" agregado.
ALTER TABLE "Payslip" ADD COLUMN     "componentsJson" TEXT;

-- AlterTable: IrsTable ganha o intervalo de meses (dentro do ano) em que
-- se aplica — Portugal pode ter mais do que uma tabela de IRS no mesmo
-- ano civil.
ALTER TABLE "IrsTable" ADD COLUMN     "monthFrom" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "monthTo" INTEGER NOT NULL DEFAULT 12;

DROP INDEX "IrsTable_year_region_tableType_key";

CREATE UNIQUE INDEX "IrsTable_year_region_tableType_monthFrom_key" ON "IrsTable"("year", "region", "tableType", "monthFrom");

-- AlterTable: PayrollSettings perde o limite de isenção do subsídio de
-- alimentação (campo morto — nunca era lido pelo motor de cálculo, que já
-- usa só FiscalYearConstants). Os limites reais editam-se agora só em
-- Pressupostos → Limites de Isenção Fiscal.
ALTER TABLE "PayrollSettings" DROP COLUMN "mealAllowanceExemptCap";

-- Corrige os valores de isenção do subsídio de alimentação para os
-- valores legais corretos (6.60€/dia em numerário, 10.60€/dia em cartão
-- refeição) — os valores anteriores (6.15/10.46) estavam desatualizados.
ALTER TABLE "FiscalYearConstants" ALTER COLUMN "mealAllowanceExemptCardDaily" SET DEFAULT 10.60;
ALTER TABLE "FiscalYearConstants" ALTER COLUMN "mealAllowanceExemptCashDaily" SET DEFAULT 6.60;
UPDATE "FiscalYearConstants" SET "mealAllowanceExemptCardDaily" = 10.60 WHERE "mealAllowanceExemptCardDaily" = 10.46;
UPDATE "FiscalYearConstants" SET "mealAllowanceExemptCashDaily" = 6.60 WHERE "mealAllowanceExemptCashDaily" = 6.15;
