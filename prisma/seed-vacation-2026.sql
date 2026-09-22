-- Apaga todas as férias de 2026 já marcadas (para nenhum colaborador poder
-- ficar com mais de 22 dias) e atribui um único período contínuo de 22
-- dias úteis por colaborador ativo, já aprovado. O início do período é
-- desfasado por colaborador para espalhar pelos vários meses do ano.
--
-- Idempotente: pode ser corrido mais que uma vez — cada execução limpa
-- primeiro o que lá estava e volta a atribuir o mesmo período (mesmo
-- desfasamento, calculado a partir da ordem alfabética dos colaboradores).

DO $$
DECLARE
  vacation_type_id TEXT;
  admin_user_id TEXT;
  emp RECORD;
  emp_index INT := 0;
  start_date DATE;
  cur_date DATE;
  collected INT;
  total_inserted INT := 0;
BEGIN
  SELECT id INTO vacation_type_id FROM "AbsenceType" WHERE "isVacation" = true LIMIT 1;
  IF vacation_type_id IS NULL THEN
    RAISE EXCEPTION 'Tipo de ausência "Férias" não encontrado — corra o seed principal primeiro.';
  END IF;

  SELECT u.id INTO admin_user_id
  FROM "User" u
  JOIN "UserRole" ur ON ur."userId" = u.id
  WHERE ur.role = 'ADMIN_SISTEMA'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id FROM "User" LIMIT 1;
  END IF;
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum utilizador encontrado para atribuir como requerente/aprovador.';
  END IF;

  -- Limpa TODAS as férias de 2026 já marcadas (qualquer estado), para
  -- garantir que ninguém fica com mais de 22 dias depois de atribuir o
  -- período único abaixo.
  DELETE FROM "Absence"
  WHERE "absenceTypeId" = vacation_type_id
    AND "startDate" BETWEEN '2026-01-01' AND '2026-12-31';

  UPDATE "AbsenceBalance"
  SET "usedDays" = 0, "plannedDays" = 0, "entitledDays" = 22
  WHERE "absenceTypeId" = vacation_type_id AND "year" = 2026;

  FOR emp IN SELECT id, "firstName", "lastName" FROM "Employee" WHERE status = 'ACTIVE' ORDER BY "firstName", "lastName" LOOP

    -- Contingente de 2026 fixado em 22 dias (cria o registo se ainda não existir).
    INSERT INTO "AbsenceBalance" (id, "employeeId", "absenceTypeId", "year", "entitledDays", "carryOverDays", "usedDays", "plannedDays")
    VALUES (
      'absb_' || md5(emp.id || ':' || vacation_type_id || ':2026'),
      emp.id, vacation_type_id, 2026, 22, 0, 0, 0
    )
    ON CONFLICT ("employeeId", "absenceTypeId", "year")
    DO UPDATE SET "entitledDays" = 22, "usedDays" = 0, "plannedDays" = 0;

    -- Início do período, desfasado por colaborador (espalha por Jan-Out,
    -- com margem suficiente para os 22 dias úteis nunca ultrapassarem 2026).
    start_date := make_date(2026, 1 + (emp_index % 10), 1 + (emp_index % 4) * 7);

    cur_date := start_date;
    collected := 0;
    WHILE collected < 22 LOOP
      IF EXTRACT(ISODOW FROM cur_date) < 6 THEN  -- 1=Segunda .. 5=Sexta
        INSERT INTO "Absence" (
          id, "employeeId", "absenceTypeId", "startDate", "endDate", days, status,
          "requestedById", "approvedById", "decidedAt", "createdAt"
        ) VALUES (
          'absc_' || md5(emp.id || ':' || cur_date::text),
          emp.id, vacation_type_id, cur_date, cur_date, 1, 'APPROVED',
          admin_user_id, admin_user_id, now(), now()
        )
        ON CONFLICT (id) DO NOTHING;
        collected := collected + 1;
        total_inserted := total_inserted + 1;
      END IF;
      cur_date := cur_date + 1;
    END LOOP;

    UPDATE "AbsenceBalance"
    SET "usedDays" = 22
    WHERE "employeeId" = emp.id AND "absenceTypeId" = vacation_type_id AND "year" = 2026;

    RAISE NOTICE '  %: % a % (22 dias úteis)', emp."firstName" || ' ' || emp."lastName", start_date, cur_date - 1;

    emp_index := emp_index + 1;
  END LOOP;

  RAISE NOTICE 'Concluído: % dia(s) de férias criado(s) para % colaborador(es).', total_inserted, emp_index;
END $$;
