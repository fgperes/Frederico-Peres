-- Desambigua nomes duplicados já existentes antes de aplicar a
-- restrição única (mantém o mais antigo com o nome original; os
-- seguintes recebem um sufixo "(duplicado N)" — nada é apagado).
WITH ranked AS (
  SELECT id, name, "isTemplate",
         ROW_NUMBER() OVER (PARTITION BY name, "isTemplate" ORDER BY "createdAt" ASC, id ASC) AS rn
  FROM "ScheduleCycle"
)
UPDATE "ScheduleCycle" sc
SET name = sc.name || ' (duplicado ' || ranked.rn || ')'
FROM ranked
WHERE sc.id = ranked.id AND ranked.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleCycle_name_isTemplate_key" ON "ScheduleCycle"("name", "isTemplate");
