-- AlterTable
ALTER TABLE "ModuleSubscription" ADD COLUMN "workAnniversaryEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AnniversaryComment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnniversaryComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnniversaryComment_employeeId_kind_year_idx" ON "AnniversaryComment"("employeeId", "kind", "year");

-- CreateIndex
CREATE UNIQUE INDEX "AnniversaryComment_employeeId_authorId_kind_year_key" ON "AnniversaryComment"("employeeId", "authorId", "kind", "year");

-- AddForeignKey
ALTER TABLE "AnniversaryComment" ADD CONSTRAINT "AnniversaryComment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnniversaryComment" ADD CONSTRAINT "AnniversaryComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
