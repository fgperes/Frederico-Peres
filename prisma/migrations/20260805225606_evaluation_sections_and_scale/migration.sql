-- AlterTable
ALTER TABLE "EvaluationAnswer" ADD COLUMN     "rawValue" INTEGER;

-- AlterTable
ALTER TABLE "EvaluationQuestion" ADD COLUMN     "scaleMax" INTEGER,
ADD COLUMN     "scaleMin" INTEGER,
ADD COLUMN     "sectionId" TEXT;

-- CreateTable
CREATE TABLE "EvaluationSection" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "EvaluationSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvaluationSection_templateId_idx" ON "EvaluationSection"("templateId");

-- CreateIndex
CREATE INDEX "EvaluationQuestion_sectionId_idx" ON "EvaluationQuestion"("sectionId");

-- AddForeignKey
ALTER TABLE "EvaluationSection" ADD CONSTRAINT "EvaluationSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EvaluationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationQuestion" ADD CONSTRAINT "EvaluationQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "EvaluationSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
