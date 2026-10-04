-- AlterTable: Absence ganha o conteúdo do comprovativo anexado (data URI,
-- base64) — o mesmo padrão já usado em EmployeeDocument.fileData.
ALTER TABLE "Absence" ADD COLUMN     "documentData" TEXT;
