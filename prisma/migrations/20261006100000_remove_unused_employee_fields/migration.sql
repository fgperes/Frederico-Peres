-- AlterTable: remove da ficha do colaborador os campos que acabaram por não
-- ser necessários — segundo documento de identificação, NIB suplementar e
-- os dados de inscrição na Ordem Profissional.
ALTER TABLE "Employee" DROP COLUMN "idDocumentType2",
DROP COLUMN "idDocument2",
DROP COLUMN "ibanSupplementary",
DROP COLUMN "professionalOrderRegistrationNo",
DROP COLUMN "professionalOrderCardNo";
