-- Número de colaborador: identificador numérico interno sem limite de
-- dígitos, guardado como texto (só dígitos) para evitar limites de Int/
-- BigInt e problemas de serialização de BigInt no lado da aplicação.
ALTER TABLE "Employee" ADD COLUMN "employeeNumber" TEXT;
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee"("employeeNumber");
