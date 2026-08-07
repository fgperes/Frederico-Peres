-- Remove linhas duplicadas de padrão de ciclo para a mesma semana/dia
-- (causadas por uma condição de corrida ao gravar a célula antes desta
-- correção) — mantém apenas a linha mais antiga (a que a grelha já
-- mostra e atualiza); as restantes são apagadas. Estas linhas extra
-- nunca foram visíveis nem editáveis pelo utilizador: só inflacionavam
-- silenciosamente o cálculo da média semanal de horas do ciclo.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "cycleId", "weekIndex", "dayOfWeek"
           ORDER BY id ASC
         ) AS rn
  FROM "ScheduleCyclePattern"
)
DELETE FROM "ScheduleCyclePattern"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleCyclePattern_cycleId_weekIndex_dayOfWeek_key" ON "ScheduleCyclePattern"("cycleId", "weekIndex", "dayOfWeek");
