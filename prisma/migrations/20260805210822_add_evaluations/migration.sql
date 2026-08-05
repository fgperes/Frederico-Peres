-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "evaluationId" TEXT;

-- CreateTable
CREATE TABLE "EvaluationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hasSelfEvaluation" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EvaluationQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationQuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "EvaluationQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationConsequenceRule" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "minPercent" INTEGER NOT NULL,
    "consequence" TEXT NOT NULL,

    CONSTRAINT "EvaluationConsequenceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationTemplateAssignment" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "teamId" TEXT,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationTemplateAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdById" TEXT NOT NULL,
    "managerCompletedAt" TIMESTAMP(3),
    "managerCompletedById" TEXT,
    "managerScore" INTEGER,
    "managerPercent" INTEGER,
    "managerConsequence" TEXT,
    "selfCompletedAt" TIMESTAMP(3),
    "selfScore" INTEGER,
    "selfPercent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationAnswer" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "respondent" TEXT NOT NULL,
    "score" INTEGER,
    "selectedOptionId" TEXT,
    "textValue" TEXT,

    CONSTRAINT "EvaluationAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvaluationQuestion_templateId_idx" ON "EvaluationQuestion"("templateId");

-- CreateIndex
CREATE INDEX "EvaluationConsequenceRule_templateId_idx" ON "EvaluationConsequenceRule"("templateId");

-- CreateIndex
CREATE INDEX "EvaluationTemplateAssignment_templateId_idx" ON "EvaluationTemplateAssignment"("templateId");

-- CreateIndex
CREATE INDEX "EvaluationTemplateAssignment_teamId_idx" ON "EvaluationTemplateAssignment"("teamId");

-- CreateIndex
CREATE INDEX "EvaluationTemplateAssignment_employeeId_idx" ON "EvaluationTemplateAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "Evaluation_employeeId_idx" ON "Evaluation"("employeeId");

-- CreateIndex
CREATE INDEX "Evaluation_status_scheduledDate_idx" ON "Evaluation"("status", "scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationAnswer_evaluationId_questionId_respondent_key" ON "EvaluationAnswer"("evaluationId", "questionId", "respondent");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationTemplate" ADD CONSTRAINT "EvaluationTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationQuestion" ADD CONSTRAINT "EvaluationQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EvaluationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationQuestionOption" ADD CONSTRAINT "EvaluationQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EvaluationQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationConsequenceRule" ADD CONSTRAINT "EvaluationConsequenceRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EvaluationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationTemplateAssignment" ADD CONSTRAINT "EvaluationTemplateAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EvaluationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationTemplateAssignment" ADD CONSTRAINT "EvaluationTemplateAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationTemplateAssignment" ADD CONSTRAINT "EvaluationTemplateAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EvaluationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_managerCompletedById_fkey" FOREIGN KEY ("managerCompletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAnswer" ADD CONSTRAINT "EvaluationAnswer_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAnswer" ADD CONSTRAINT "EvaluationAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EvaluationQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAnswer" ADD CONSTRAINT "EvaluationAnswer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "EvaluationQuestionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
