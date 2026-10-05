-- AlterTable: Payslip passa a guardar a data/utilizador da última vez que
-- foi gerado novamente (distinto de generatedAt/generatedById, que ficam
-- fixos na 1ª geração), quantas vezes já foi regenerado, e quando foi
-- enviado por email ao colaborador.
ALTER TABLE "Payslip" ADD COLUMN     "regeneratedAt" TIMESTAMP(3),
ADD COLUMN     "regeneratedById" TEXT,
ADD COLUMN     "regenerationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailSentAt" TIMESTAMP(3);
