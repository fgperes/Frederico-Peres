-- Marca 22 dias de férias aprovados em 2026 para cada colaborador ativo,
-- e fixa o contingente (entitledDays) de 2026 em 22 dias para todos.
-- Equivalente em SQL puro a `npm run db:seed-vacation-2026`, para correr
-- diretamente no SQL Editor do Supabase.
--
-- Idempotente: pode ser corrido mais que uma vez sem duplicar dias nem
-- ultrapassar os 22 dias por colaborador (conta o que já está aprovado em
-- 2026 e só acrescenta o que falta).

DO $$
DECLARE
  vacation_type_id TEXT;
  admin_user_id TEXT;
  emp RECORD;
  vacation_date DATE;
  used_count INT;
  missing_count INT;
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

  FOR emp IN SELECT id, "firstName", "lastName" FROM "Employee" WHERE status = 'ACTIVE' LOOP

    -- Contingente de 2026 fixado em 22 dias (cria ou atualiza).
    INSERT INTO "AbsenceBalance" (id, "employeeId", "absenceTypeId", "year", "entitledDays", "carryOverDays", "usedDays", "plannedDays")
    VALUES (
      'absb_' || md5(emp.id || ':' || vacation_type_id || ':2026'),
      emp.id, vacation_type_id, 2026, 22, 0, 0, 0
    )
    ON CONFLICT ("employeeId", "absenceTypeId", "year")
    DO UPDATE SET "entitledDays" = 22;

    SELECT count(*) INTO used_count
    FROM "Absence" a
    WHERE a."employeeId" = emp.id
      AND a."absenceTypeId" = vacation_type_id
      AND a.status = 'APPROVED'
      AND a."startDate" BETWEEN '2026-01-01' AND '2026-12-31';

    missing_count := GREATEST(0, 22 - used_count);

    IF missing_count > 0 THEN
      FOR vacation_date IN
        SELECT d::date
        FROM generate_series('2026-01-01'::date, '2026-12-31'::date, interval '1 day') AS d
        WHERE EXTRACT(ISODOW FROM d) < 6  -- 1=Segunda .. 5=Sexta
          AND NOT EXISTS (
            SELECT 1 FROM "Absence" a
            WHERE a."employeeId" = emp.id
              AND a."absenceTypeId" = vacation_type_id
              AND a."startDate" = d::date
          )
        ORDER BY random()
        LIMIT missing_count
      LOOP
        INSERT INTO "Absence" (
          id, "employeeId", "absenceTypeId", "startDate", "endDate", days, status,
          "requestedById", "approvedById", "decidedAt", "createdAt"
        ) VALUES (
          'absc_' || md5(emp.id || ':' || vacation_date::text),
          emp.id, vacation_type_id, vacation_date, vacation_date, 1, 'APPROVED',
          admin_user_id, admin_user_id, now(), now()
        )
        ON CONFLICT (id) DO NOTHING;
        total_inserted := total_inserted + 1;
      END LOOP;
    END IF;

    SELECT count(*) INTO used_count
    FROM "Absence" a
    WHERE a."employeeId" = emp.id
      AND a."absenceTypeId" = vacation_type_id
      AND a.status = 'APPROVED'
      AND a."startDate" BETWEEN '2026-01-01' AND '2026-12-31';

    UPDATE "AbsenceBalance"
    SET "usedDays" = used_count
    WHERE "employeeId" = emp.id AND "absenceTypeId" = vacation_type_id AND "year" = 2026;

    RAISE NOTICE '  %: % dia(s) de férias em 2026', emp."firstName" || ' ' || emp."lastName", used_count;
  END LOOP;

  RAISE NOTICE 'Concluído: % novo(s) dia(s) de férias criado(s).', total_inserted;
END $$;
