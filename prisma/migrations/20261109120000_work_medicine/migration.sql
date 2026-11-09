-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "workMedicineAppointmentId" TEXT;

-- CreateTable
CREATE TABLE "WorkMedicineEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nif" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkMedicineEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkMedicineAddress" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT,
    "municipality" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkMedicineAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkMedicineAppointment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "entityId" TEXT,
    "addressId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AGENDADA',
    "resultStatus" TEXT,
    "resultNotes" TEXT,
    "resultDocumentName" TEXT,
    "resultDocumentType" TEXT,
    "resultDocumentData" TEXT,
    "realizationConfirmedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkMedicineAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkMedicineEntity_nif_key" ON "WorkMedicineEntity"("nif");

-- CreateIndex
CREATE INDEX "WorkMedicineAppointment_employeeId_status_idx" ON "WorkMedicineAppointment"("employeeId", "status");

-- CreateIndex
CREATE INDEX "WorkMedicineAppointment_status_scheduledAt_idx" ON "WorkMedicineAppointment"("status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workMedicineAppointmentId_fkey" FOREIGN KEY ("workMedicineAppointmentId") REFERENCES "WorkMedicineAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkMedicineAddress" ADD CONSTRAINT "WorkMedicineAddress_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "WorkMedicineEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkMedicineAppointment" ADD CONSTRAINT "WorkMedicineAppointment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkMedicineAppointment" ADD CONSTRAINT "WorkMedicineAppointment_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "WorkMedicineEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkMedicineAppointment" ADD CONSTRAINT "WorkMedicineAppointment_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "WorkMedicineAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkMedicineAppointment" ADD CONSTRAINT "WorkMedicineAppointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkMedicineAppointment" ADD CONSTRAINT "WorkMedicineAppointment_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
