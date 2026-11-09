-- AlterTable
ALTER TABLE "TrainingModality" DROP CONSTRAINT IF EXISTS "TrainingModality_name_key";
DROP INDEX IF EXISTS "TrainingModality_name_key";
ALTER TABLE "TrainingModality" RENAME COLUMN "name" TO "code";
ALTER TABLE "TrainingModality" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TrainingModality" ALTER COLUMN "description" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "TrainingModality_code_key" ON "TrainingModality"("code");

-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN "startTime" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TrainingSession" ALTER COLUMN "startTime" DROP DEFAULT;
