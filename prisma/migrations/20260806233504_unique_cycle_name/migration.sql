-- CreateIndex
CREATE UNIQUE INDEX "ScheduleCycle_name_isTemplate_key" ON "ScheduleCycle"("name", "isTemplate");
