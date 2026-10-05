import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { employeeScopeWhere } from "@/lib/scope";
import { getWeekStart, getWeekDays, isoDate, addWeeksIso } from "@/lib/dates";
import { computeScheduledHeadcountByHour, computeActualHeadcountByHour } from "@/lib/schedule-hourly";
import { PageHeader, Card } from "@/components/ui";
import { EscalasNavPills } from "../escalas-nav-pills";
import { ExecucaoFilterPanel } from "./execucao-filter-panel";
import { DayPicker } from "./day-picker";
import { HourlyBarChart } from "./hourly-bar-chart";
import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// Horas a mostrar: as que têm turno ou picagem (Previsto/Real), com uma
// hora de margem de cada lado — em vez das 24h todas, que ficariam
// maioritariamente vazias. Se o dia não tiver nada, cai num intervalo
// "comercial" razoável (8h-20h) em vez de ficar sem gráfico nenhum.
function relevantHours(scheduled: number[], actual: number[]): number[] {
  let min = -1;
  let max = -1;
  for (let h = 0; h < 24; h++) {
    if (scheduled[h] > 0 || actual[h] > 0) {
      if (min === -1) min = h;
      max = h;
    }
  }
  if (min === -1) return Array.from({ length: 13 }, (_, i) => i + 8); // 8h-20h
  const from = Math.max(0, min - 1);
  const to = Math.min(23, max + 1);
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

export default async function ExecucaoEscalasPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    day?: string;
    departmentId?: string | string[];
    locationId?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const scope = await employeeScopeWhere(user);

  const weekStart = getWeekStart(params.week);
  const weekDays = getWeekDays(weekStart);
  const week = isoDate(weekStart);

  const today = isoDate(new Date());
  const todayInWeek = weekDays.some((d) => isoDate(d) === today);
  const day = params.day ?? (todayInWeek ? today : week);
  const selectedDate = weekDays.find((d) => isoDate(d) === day) ?? weekStart;

  let filterDepartmentIds = toArray(params.departmentId);
  let filterLocationIds = toArray(params.locationId);

  // Âmbito de acesso do utilizador (ex.: Gestor de Equipa só vê os seus
  // departamentos) — restringe as opções do filtro e o cálculo às
  // mesmas regras já usadas nas outras vistas de Escalas.
  const scopedEmployees = await prisma.employee.findMany({
    where: scope,
    select: { departmentId: true, locationId: true },
  });
  const scopedDepartmentIds = [...new Set(scopedEmployees.map((e) => e.departmentId).filter((v): v is string => !!v))];
  const scopedLocationIds = [...new Set(scopedEmployees.map((e) => e.locationId).filter((v): v is string => !!v))];
  const isRestrictedScope = Object.keys(scope).length > 0;

  if (isRestrictedScope) {
    filterDepartmentIds = filterDepartmentIds.length
      ? filterDepartmentIds.filter((id) => scopedDepartmentIds.includes(id))
      : scopedDepartmentIds;
    filterLocationIds = filterLocationIds.length
      ? filterLocationIds.filter((id) => scopedLocationIds.includes(id))
      : scopedLocationIds;
  }

  const [departments, locations, scheduled, actual] = await Promise.all([
    prisma.department.findMany({
      where: isRestrictedScope ? { id: { in: scopedDepartmentIds } } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      where: isRestrictedScope ? { id: { in: scopedLocationIds } } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    computeScheduledHeadcountByHour(selectedDate, filterDepartmentIds, filterLocationIds),
    computeActualHeadcountByHour(selectedDate, filterDepartmentIds, filterLocationIds),
  ]);

  const hours = relevantHours(scheduled, actual);
  const filterSuffix =
    (filterDepartmentIds.length ? "&" + filterDepartmentIds.map((id) => `departmentId=${id}`).join("&") : "") +
    (filterLocationIds.length ? "&" + filterLocationIds.map((id) => `locationId=${id}`).join("&") : "");

  return (
    <div>
      <PageHeader
        icon={CalendarRange}
        title="Escalas"
        description="Execução — efetivo previsto (escala) vs real (picagens), por hora."
      />

      <Card className="mb-6 bg-gradient-to-br from-white to-stone-50 dark:from-stone-900 dark:to-stone-950">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ExecucaoFilterPanel
            departments={departments}
            locations={locations}
            initialDepartmentIds={filterDepartmentIds}
            initialLocationIds={filterLocationIds}
            week={week}
            day={day}
          />
          <EscalasNavPills active="execucao" filterQuery={filterSuffix.replace(/^&/, "")} />
        </div>
      </Card>

      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/escalas/execucao?week=${addWeeksIso(week, -1)}&day=${day}${filterSuffix}`}
              prefetch={false}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              <ChevronLeft size={16} />
            </Link>
            <span className="px-1 text-sm font-medium text-stone-700 dark:text-stone-300">
              Semana de {weekDays[0].toLocaleDateString("pt-PT")} a {weekDays[6].toLocaleDateString("pt-PT")}
            </span>
            <Link
              href={`/escalas/execucao?week=${addWeeksIso(week, 1)}&day=${day}${filterSuffix}`}
              prefetch={false}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              <ChevronRight size={16} />
            </Link>
          </div>
          <DayPicker weekDays={weekDays} selectedDay={day} week={week} filterSuffix={filterSuffix} />
        </div>

        <HourlyBarChart hours={hours} scheduled={scheduled} actual={actual} />
      </Card>
    </div>
  );
}
