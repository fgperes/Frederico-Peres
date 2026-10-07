-- AlterTable: Employee ganha o vencimento base — pertence ao colaborador,
-- não ao contrato, porque um aumento salarial não implica criar/alterar
-- um contrato.
ALTER TABLE "Employee" ADD COLUMN     "baseSalary" DOUBLE PRECISION;

-- Backfill: copia o vencimento base do contrato ATIVO mais recente de cada
-- colaborador, antes de a coluna deixar de existir em EmployeeContract.
UPDATE "Employee" e
SET "baseSalary" = sub."baseSalary"
FROM (
  SELECT DISTINCT ON ("employeeId") "employeeId", "baseSalary"
  FROM "EmployeeContract"
  WHERE "status" = 'ACTIVE' AND "baseSalary" IS NOT NULL
  ORDER BY "employeeId", "startDate" DESC
) sub
WHERE e."id" = sub."employeeId";

-- AlterTable: EmployeeContract perde o vencimento base (passou para
-- Employee) e o documento contratual (passou a ser um anexo obrigatório
-- em EmployeeDocument, com o nome "Contrato de trabalho"/"Adenda
-- contratual").
ALTER TABLE "EmployeeContract" DROP COLUMN "baseSalary";
ALTER TABLE "EmployeeContract" DROP COLUMN "documentName";
ALTER TABLE "EmployeeContract" DROP COLUMN "documentData";
