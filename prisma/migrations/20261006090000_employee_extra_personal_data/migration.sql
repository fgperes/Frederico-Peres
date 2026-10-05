-- AlterTable: Employee ganha mais dados pessoais, contactos e contacto de
-- emergência (alinhados com os campos da ficha pessoal importada de outro
-- sistema de referência) — "childrenCount" é informativo, distinto de
-- "dependents" (já existente, usado no cálculo de IRS do Payroll).
ALTER TABLE "Employee" ADD COLUMN     "idDocumentIssuePlace" TEXT,
ADD COLUMN     "idDocumentType2" TEXT,
ADD COLUMN     "idDocument2" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "educationLevel" TEXT,
ADD COLUMN     "erpCode" TEXT,
ADD COLUMN     "ibanSupplementary" TEXT,
ADD COLUMN     "mealCardIban" TEXT,
ADD COLUMN     "expensesIban" TEXT,
ADD COLUMN     "childrenCount" INTEGER DEFAULT 0,
ADD COLUMN     "professionalOrderRegistrationNo" TEXT,
ADD COLUMN     "professionalOrderCardNo" TEXT,
ADD COLUMN     "mobilePhone" TEXT,
ADD COLUMN     "locality" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "bloodType" TEXT,
ADD COLUMN     "emergencyContact1Name" TEXT,
ADD COLUMN     "emergencyContact1Phone" TEXT,
ADD COLUMN     "emergencyContact2Name" TEXT,
ADD COLUMN     "emergencyContact2Phone" TEXT;
