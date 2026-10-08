-- AlterTable: Payslip ganha as taxas de SS e de IRS aplicadas no momento
-- da geração, para o recibo mostrar "(11%)" / "(38.36%)" junto dos
-- valores descontados. Recibos já gerados ficam a 0 (sem percentagem
-- visível) até serem regenerados.
ALTER TABLE "Payslip" ADD COLUMN     "socialSecurityRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "irsRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
