-- Migração de dados: Contract (modelo antigo, 1 linha por colaborador) para
-- ContractProfile + EmployeeContract (perfil partilhado + histórico por
-- colaborador). Corre depois de as tabelas novas já existirem (migração
-- 20260923000000_contract_profiles) e ANTES ou DEPOIS do deploy do código
-- novo — a tabela "Contract" antiga não é apagada, fica como rede de
-- segurança para reverter se for preciso.
--
-- Pode ser corrida mais do que uma vez em segurança: os ids são
-- determinísticos (md5) e os INSERTs usam ON CONFLICT DO NOTHING.

-- 1) Um ContractProfile por cada combinação única de
--    (contractType, weeklyHours, weeklyRestDays) que existe na tabela
--    "Contract" — colaboradores com as mesmas condições passam a partilhar
--    o mesmo perfil, tal como já acontecia na vista agrupada da app.
INSERT INTO "ContractProfile" (id, name, "contractType", "weeklyHours", "weeklyRestDays", active, "createdAt", "updatedAt")
SELECT
  'cprof_' || md5(g."contractType" || ':' || g."weeklyHours"::text || ':' || g."weeklyRestDays"::text),
  COALESCE(ctd.label, g."contractType") || ' — ' || g."weeklyHours" || 'h × ' || g."weeklyRestDays" || ' folga(s)/semana',
  g."contractType",
  g."weeklyHours",
  g."weeklyRestDays",
  true,
  now(),
  now()
FROM (
  SELECT DISTINCT "contractType", "weeklyHours", "weeklyRestDays" FROM "Contract"
) g
LEFT JOIN "ContractTypeDefinition" ctd ON ctd.key = g."contractType"
ON CONFLICT (id) DO NOTHING;

-- 2) Uma EmployeeContract por cada linha existente em "Contract", ligada ao
--    ContractProfile correspondente. Por colaborador, só a atribuição mais
--    recente que já estava ACTIVE no modelo antigo fica ACTIVE no novo —
--    todas as outras (incluindo versões/aditamentos anteriores) passam a
--    ENDED, para garantir o invariante "no máximo 1 contrato ativo por
--    colaborador" que a app agora assume. As datas de fim originais
--    mantêm-se tal como estavam (não são recalculadas).
INSERT INTO "EmployeeContract" (
  id, "employeeId", "contractProfileId", "startDate", "endDate",
  "trialPeriodEndDate", "baseSalary", "documentName", notes, status,
  "createdAt", "updatedAt"
)
SELECT
  'econ_' || md5(c.id),
  c."employeeId",
  'cprof_' || md5(c."contractType" || ':' || c."weeklyHours"::text || ':' || c."weeklyRestDays"::text),
  c."startDate",
  c."endDate",
  c."trialPeriodEndDate",
  c."baseSalary",
  c."documentName",
  c.notes,
  CASE
    WHEN c.status = 'ACTIVE' AND c.id = (
      SELECT c2.id FROM "Contract" c2
      WHERE c2."employeeId" = c."employeeId" AND c2.status = 'ACTIVE'
      ORDER BY c2."startDate" DESC, c2.version DESC
      LIMIT 1
    ) THEN 'ACTIVE'
    ELSE 'ENDED'
  END,
  c."createdAt",
  c."updatedAt"
FROM "Contract" c
ON CONFLICT (id) DO NOTHING;

-- Resumo
DO $$
DECLARE
  profile_count INT;
  assignment_count INT;
  active_count INT;
BEGIN
  SELECT count(*) INTO profile_count FROM "ContractProfile";
  SELECT count(*) INTO assignment_count FROM "EmployeeContract";
  SELECT count(*) INTO active_count FROM "EmployeeContract" WHERE status = 'ACTIVE';
  RAISE NOTICE 'ContractProfile: % perfis · EmployeeContract: % atribuições (% ativas)', profile_count, assignment_count, active_count;
END $$;
