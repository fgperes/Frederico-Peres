-- AlterTable: ShiftTemplate ganha a hora de início da pausa de refeição
-- (distinta de breakMins, que só guarda a duração) — para ter o mesmo
-- turno com colaboradores a almoçar a horas diferentes, criam-se vários
-- modelos com o mesmo startTime/endTime e breakStart diferente.
ALTER TABLE "ShiftTemplate" ADD COLUMN     "breakStart" TEXT;

-- CreateTable: horário de funcionamento por departamento ou por local,
-- usado pela geração de escalas para nunca propor turnos fora do horário
-- em que o departamento/local está aberto.
CREATE TABLE "OperatingHours" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT,
    "locationId" TEXT,
    "dayOfWeek" INTEGER,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "openTime" TEXT,
    "closeTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatingHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatingHours_departmentId_dayOfWeek_isHoliday_key" ON "OperatingHours"("departmentId", "dayOfWeek", "isHoliday");

-- CreateIndex
CREATE UNIQUE INDEX "OperatingHours_locationId_dayOfWeek_isHoliday_key" ON "OperatingHours"("locationId", "dayOfWeek", "isHoliday");

-- AddForeignKey
ALTER TABLE "OperatingHours" ADD CONSTRAINT "OperatingHours_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatingHours" ADD CONSTRAINT "OperatingHours_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
