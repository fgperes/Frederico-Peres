-- AlterTable: Location ganha morada estruturada (distrito/concelho/código postal)
ALTER TABLE "Location" ADD COLUMN     "postalCode" TEXT;
ALTER TABLE "Location" ADD COLUMN     "municipality" TEXT;
ALTER TABLE "Location" ADD COLUMN     "district" TEXT;

-- AlterTable: Holiday passa a indicar os concelhos abrangidos (feriados
-- regionais), em vez de uma relação com locais de trabalho específicos.
ALTER TABLE "Holiday" ADD COLUMN     "municipalities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- DropForeignKey
ALTER TABLE "_HolidayLocations" DROP CONSTRAINT "_HolidayLocations_A_fkey";
ALTER TABLE "_HolidayLocations" DROP CONSTRAINT "_HolidayLocations_B_fkey";

-- DropTable
-- Nenhum feriado regional foi criado em produção até agora (só os feriados
-- nacionais chegaram a ser semeados) — não há dados a perder aqui.
DROP TABLE "_HolidayLocations";
