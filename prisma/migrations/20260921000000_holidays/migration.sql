-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'NATIONAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_description_key" ON "Holiday"("date", "description");

-- CreateTable
CREATE TABLE "_HolidayLocations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_HolidayLocations_AB_unique" ON "_HolidayLocations"("A", "B");

-- CreateIndex
CREATE INDEX "_HolidayLocations_B_index" ON "_HolidayLocations"("B");

-- AddForeignKey
ALTER TABLE "_HolidayLocations" ADD CONSTRAINT "_HolidayLocations_A_fkey" FOREIGN KEY ("A") REFERENCES "Holiday"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HolidayLocations" ADD CONSTRAINT "_HolidayLocations_B_fkey" FOREIGN KEY ("B") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
