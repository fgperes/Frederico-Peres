import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import {
  getWeekStart,
  getWeekDays,
  getMonthStart,
  getMonthDays,
  isoDate,
  WEEKDAY_LABELS,
  addWeeksIso,
  addMonthsIso,
} from "@/lib/dates";
import { PageHeader, Card, Badge } from "@/components/ui";
import { SendScheduleButton } from "./send-schedule-button";
import { GenerateToolbar } from "./generate-toolbar";
import { ScheduleGrid } from "./schedule-grid";
import { MonthYearPicker } from "./month-year-picker";
import { ScheduleFilterPanel } from "./schedule-filter-panel";
import { ScheduleAlertsBanner } from "./schedule-alerts-banner";
import { FullscreenSection } from "./fullscreen-section";
import type { ShiftTemplateOption } from "./shift-modal";
import { findScheduleAlerts } from "@/lib/schedule-alerts";
import { computeCoverage } from "@/lib/schedule-coverage";
import { SchedulePdfButton, type SchedulePdfRow } from "@/components/schedule-pdf-button";
import { getDocumentBranding } from "@/lib/document-branding";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";

// Os filtros aceitam vários valores por campo — quando só há um valor
// selecionado o Next.js entrega uma string simples (não um array de um
// elemento), por isso é preciso normalizar sempre para array.
function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function buildFilterQuery(departmentIds: string[], teamIds: string[], employeeIds: string[]): string {
  const usp = new URLSearchParams();
  for (const id of departmentIds) usp.append("departmentId", id);
  for (const id of teamIds) usp.append("teamId", id);
  for (const id of employeeIds) usp.append("employeeId", id);
  return usp.toString();
}

export default async function EscalasPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    week?: string;
    month?: string;
    departmentId?: string | string[];
    teamId?: string | string[];
    employeeId?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const canEdit = canWrite(user.roles, "horarios");
  const scope = await employeeScopeWhere(user);
  const view = params.view === "month" ? "month" : "week";

  const filterDepartmentIds = toArray(params.departmentId);
  const filterTeamIds = toArray(params.teamId);
  const filterEmployeeIds = toArray(params.employeeId);

  const employeeWhere: Prisma.EmployeeWhereInput = {
    AND: [
      scope,
      { status: "ACTIVE" },
      filterDepartmentIds.length > 0 ? { departmentId: { in: filterDepartmentIds } } : {},
      filterTeamIds.length > 0 ? { teamId: { in: filterTeamIds } } : {},
      filterEmployeeIds.length > 0 ? { id: { in: filterEmployeeIds } } : {},
    ],
  };

  const [employees, allEmployees, departments, teams, branding, shiftTemplates] = await Promise.all([
    prisma.employee.findMany({
      where: employeeWhere,
      include: { user: { select: { avatarKey: true, avatarImage: true } } },
      orderBy: [{ lastName: "asc" }],
    }),
    // Lista completa (só com o âmbito de acesso, sem os filtros aplicados)
    // para o seletor de filtros poder escolher entre todos, não só entre
    // os que já correspondem ao filtro atual.
    prisma.employee.findMany({
      where: { AND: [scope, { status: "ACTIVE" }] },
      select: { id: true, firstName: true, lastName: true, departmentId: true },
      orderBy: [{ firstName: "asc" }],
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    getDocumentBranding(),
    prisma.shiftTemplate.findMany({
      select: { id: true, name: true, startTime: true, endTime: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const employeeIds = employees.map((e) => e.id);

  const filterQuery = buildFilterQuery(filterDepartmentIds, filterTeamIds, filterEmployeeIds);

  return (
    <div>
      <PageHeader
        icon={CalendarRange}
        title="Escalas"
        description="Geração, publicação e consulta de escalas, por semana ou por mês."
      />

      <Card className="mb-6 bg-gradient-to-br from-white to-stone-50 dark:from-stone-900 dark:to-stone-950">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ScheduleFilterPanel
            departments={departments}
            teams={teams}
            employees={allEmployees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, departmentId: e.departmentId }))}
            initialDepartmentIds={filterDepartmentIds}
            initialTeamIds={filterTeamIds}
            initialEmployeeIds={filterEmployeeIds}
            basePath="/escalas"
            view={view}
            week={params.week}
            month={params.month}
          />

          <div className="flex overflow-hidden rounded-full border border-stone-300 dark:border-stone-700">
            <Link
              href={`/escalas?view=week&${filterQuery}`}
              prefetch={false}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                view === "week"
                  ? "bg-violet-600 text-white"
                  : "bg-white text-stone-600 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              Semana
            </Link>
            <Link
              href={`/escalas?view=month&${filterQuery}`}
              prefetch={false}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                view === "month"
                  ? "bg-violet-600 text-white"
                  : "bg-white text-stone-600 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              Mês
            </Link>
          </div>
        </div>
      </Card>

      {canEdit && (
        <GenerateToolbar
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          employees={employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, departmentId: e.departmentId }))}
          defaultFrom={
            view === "month"
              ? isoDate(getMonthStart(params.month))
              : isoDate(getWeekStart(params.week))
          }
          defaultTo={
            view === "month"
              ? isoDate(getMonthDays(getMonthStart(params.month)).at(-1)!)
              : isoDate(getWeekDays(getWeekStart(params.week))[6])
          }
        />
      )}

      {view === "week" ? (
        <WeekView
          params={params}
          filterQuery={filterQuery}
          employees={employees}
          employeeIds={employeeIds}
          departments={departments}
          teams={teams}
          canEdit={canEdit}
          branding={branding}
          shiftTemplates={shiftTemplates}
        />
      ) : (
        <MonthView
          params={params}
          filterQuery={filterQuery}
          employees={employees}
          employeeIds={employeeIds}
          departments={departments}
          teams={teams}
          canEdit={canEdit}
          branding={branding}
          shiftTemplates={shiftTemplates}
        />
      )}
    </div>
  );
}

function PeriodNav({
  prevHref,
  nextHref,
  todayHref,
  label,
}: {
  prevHref: string;
  nextHref: string;
  todayHref: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={prevHref}
        prefetch={false}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        <ChevronLeft size={15} />
      </Link>
      <Link
        href={todayHref}
        prefetch={false}
        className="rounded-full border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        Hoje
      </Link>
      <span className="min-w-[180px] px-2 text-center text-sm font-semibold capitalize text-stone-800 dark:text-stone-200">
        {label}
      </span>
      <Link
        href={nextHref}
        prefetch={false}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        <ChevronRight size={15} />
      </Link>
    </div>
  );
}

// Resumo do estado dos turnos visíveis no período — espelha o badge do
// módulo de referência (rascunho/publicado) junto à navegação de período.
function PeriodStatusBadge({ shifts }: { shifts: { status: string }[] }) {
  if (shifts.length === 0) return null;
  const hasDraft = shifts.some((s) => s.status === "DRAFT");
  const hasPublished = shifts.some((s) => s.status === "PUBLISHED");
  if (hasDraft) return <Badge color="amber">rascunho</Badge>;
  if (hasPublished) return <Badge color="green">publicado</Badge>;
  return null;
}

function StatusLegend() {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
      <span className="flex items-center gap-1">
        <Badge color="amber">rascunho</Badge> por publicar
      </span>
      <span className="flex items-center gap-1">
        <Badge color="green">publicado</Badge>
      </span>
      <span className="flex items-center gap-1">
        <Badge color="red">alterado após publicação</Badge>
      </span>
      <span className="flex items-center gap-1">
        <Badge color="blue">férias</Badge> / <Badge color="red">baixa</Badge> / <Badge color="amber">formação</Badge> /{" "}
        <Badge color="slate">outra ausência</Badge>
      </span>
      <span className="flex items-center gap-1 italic text-stone-400 dark:text-stone-600">Folga — sem turno nem ausência</span>
    </p>
  );
}

type Branding = { clientCompanyName: string | null; clientCompanyLogo: string | null };

// Férias/ausências aprovadas dos colaboradores visíveis, para os dias
// mostrados na grelha — o gerador de escalas já não cria turno nesses dias
// (ver generateSchedulesForEmployees), isto só torna essa exclusão visível.
async function loadAbsencesForDays(employeeIds: string[], days: Date[]) {
  if (employeeIds.length === 0 || days.length === 0) return [];

  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];
  const absences = await prisma.absence.findMany({
    where: {
      employeeId: { in: employeeIds },
      status: "APPROVED",
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
    },
    include: { absenceType: { select: { name: true, isVacation: true } } },
  });

  const entries: { employeeId: string; date: Date; label: string; isVacation: boolean }[] = [];
  for (const a of absences) {
    for (const day of days) {
      if (a.startDate <= day && a.endDate >= day) {
        entries.push({
          employeeId: a.employeeId,
          date: day,
          label: a.absenceType.name,
          isVacation: a.absenceType.isVacation,
        });
      }
    }
  }
  return entries;
}

// Alertas (descanso/sobreposição/excesso de horas/dias seguidos) e
// cobertura prevista para os turnos já carregados — partilhado entre as
// vistas de semana e de mês.
async function loadAlertsAndCoverage(
  employeeIds: string[],
  employees: { id: string; firstName: string; lastName: string }[],
  shifts: { employeeId: string; date: Date; startTime: string; endTime: string }[],
  days: Date[],
  departmentId: string | null | undefined
) {
  const contracts =
    employeeIds.length > 0
      ? await prisma.employeeContract.findMany({
          where: { employeeId: { in: employeeIds }, status: "ACTIVE" },
          include: { contractProfile: { select: { weeklyHours: true } } },
        })
      : [];
  const weeklyContractHoursByEmployee = new Map<string, number>();
  for (const c of contracts) {
    if (!weeklyContractHoursByEmployee.has(c.employeeId)) {
      weeklyContractHoursByEmployee.set(c.employeeId, c.contractProfile.weeklyHours);
    }
  }

  const alerts = findScheduleAlerts(shifts, employees, weeklyContractHoursByEmployee);
  const alertCells = new Set<string>();
  for (const a of alerts) {
    for (const d of a.dates) alertCells.add(`${a.employeeId}_${d}`);
  }

  const employeesByDay = new Map<string, Set<string>>();
  for (const s of shifts) {
    const dayIso = isoDate(s.date);
    const set = employeesByDay.get(dayIso) ?? new Set<string>();
    set.add(s.employeeId);
    employeesByDay.set(dayIso, set);
  }
  const shiftsByDay = new Map([...employeesByDay.entries()].map(([k, v]) => [k, v.size] as const));
  const coverage = await computeCoverage(days, departmentId, shiftsByDay);

  return { alerts, alertCells, coverage };
}

function filterSubtitle(
  departmentIds: string[],
  teamIds: string[],
  departments: { id: string; name: string }[],
  teams: { id: string; name: string }[]
): string {
  const deptNames = departmentIds.map((id) => departments.find((d) => d.id === id)?.name).filter(Boolean);
  const teamNames = teamIds.map((id) => teams.find((t) => t.id === id)?.name).filter(Boolean);
  return [...deptNames, ...teamNames].join(" / ") || "Todos os departamentos";
}

// Sigla curta para o PDF do horário (a afixar) — "F" para folga, 3 letras
// maiúsculas do tipo de ausência (ex.: "Férias" -> "FÉR", "Baixa Médica" ->
// "BAI"). Qualquer dia sem turno nem ausência é folga — não fica em branco.
function pdfCellLabel(
  employeeId: string,
  day: Date,
  shifts: { employeeId: string; date: Date; startTime: string; endTime: string }[],
  absences: { employeeId: string; date: Date; label: string }[]
): string {
  const dayIso = isoDate(day);
  const shift = shifts.find((s) => s.employeeId === employeeId && isoDate(s.date) === dayIso);
  if (shift) return `${shift.startTime}-${shift.endTime}`;
  const absence = absences.find((a) => a.employeeId === employeeId && isoDate(a.date) === dayIso);
  if (absence) return absence.label.slice(0, 3).toUpperCase();
  return "F";
}

async function WeekView({
  params,
  filterQuery,
  employees,
  employeeIds,
  departments,
  teams,
  canEdit,
  branding,
  shiftTemplates,
}: {
  params: { week?: string; departmentId?: string | string[]; teamId?: string | string[] };
  filterQuery: string;
  employees: { id: string; firstName: string; lastName: string; employeeNumber: string | null; weeklyHours: number }[];
  employeeIds: string[];
  departments: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  canEdit: boolean;
  branding: Branding;
  shiftTemplates: ShiftTemplateOption[];
}) {
  const filterDepartmentIds = toArray(params.departmentId);
  const filterTeamIds = toArray(params.teamId);
  const weekStart = getWeekStart(params.week);
  const weekStartIso = isoDate(weekStart);
  const days = getWeekDays(weekStart);
  const prevWeek = addWeeksIso(weekStartIso, -1);
  const nextWeek = addWeeksIso(weekStartIso, 1);
  const weekLabel = `${weekStart.toLocaleDateString("pt-PT")} a ${days[6].toLocaleDateString("pt-PT")}`;

  const [shifts, absences] = await Promise.all([
    prisma.shift.findMany({
      where: { employeeId: { in: employeeIds }, date: { in: days } },
      include: { shiftTemplate: { select: { name: true, color: true, breakMins: true } } },
    }),
    loadAbsencesForDays(employeeIds, days),
  ]);
  const { alerts, alertCells, coverage } = await loadAlertsAndCoverage(
    employeeIds,
    employees,
    shifts,
    days,
    filterDepartmentIds.length === 1 ? filterDepartmentIds[0] : null
  );

  const pdfRows: SchedulePdfRow[] = employees.map((e) => ({
    employeeName: `${e.firstName} ${e.lastName}`,
    employeeNumber: e.employeeNumber,
    cells: days.map((d) => pdfCellLabel(e.id, d, shifts, absences)),
  }));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <PeriodNav
            prevHref={`/escalas?view=week&week=${prevWeek}&${filterQuery}`}
            nextHref={`/escalas?view=week&week=${nextWeek}&${filterQuery}`}
            todayHref={`/escalas?view=week&${filterQuery}`}
            label={`Semana de ${weekLabel}`}
          />
          <PeriodStatusBadge shifts={shifts} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SchedulePdfButton
            title={`Escala semanal — ${weekLabel}`}
            subtitle={filterSubtitle(filterDepartmentIds, filterTeamIds, departments, teams)}
            weekDayLabels={WEEKDAY_LABELS}
            rows={pdfRows}
            clientCompanyName={branding.clientCompanyName}
            clientCompanyLogo={branding.clientCompanyLogo}
          />
          {canEdit && <SendScheduleButton employeeIds={employeeIds} weekLabel={weekLabel} />}
        </div>
      </div>

      <ScheduleAlertsBanner alerts={alerts} />
      <FullscreenSection>
        <ScheduleGrid
          employees={employees}
          days={days}
          shifts={shifts}
          absences={absences}
          shiftTemplates={shiftTemplates}
          alertCells={alertCells}
          coverage={coverage ?? undefined}
          canEdit={canEdit}
        />
      </FullscreenSection>
      <StatusLegend />
    </>
  );
}

async function MonthView({
  params,
  filterQuery,
  employees,
  employeeIds,
  departments,
  teams,
  canEdit,
  branding,
  shiftTemplates,
}: {
  params: { month?: string; departmentId?: string | string[]; teamId?: string | string[] };
  filterQuery: string;
  employees: { id: string; firstName: string; lastName: string; employeeNumber: string | null; weeklyHours: number }[];
  employeeIds: string[];
  departments: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  canEdit: boolean;
  branding: Branding;
  shiftTemplates: ShiftTemplateOption[];
}) {
  const filterDepartmentIds = toArray(params.departmentId);
  const filterTeamIds = toArray(params.teamId);
  const monthStart = getMonthStart(params.month);
  const monthStartIso = isoDate(monthStart);
  const days = getMonthDays(monthStart);
  const prevMonth = addMonthsIso(monthStartIso, -1);
  const nextMonth = addMonthsIso(monthStartIso, 1);
  const monthLabel = monthStart.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

  const [shifts, absences] = await Promise.all([
    prisma.shift.findMany({
      where: { employeeId: { in: employeeIds }, date: { gte: days[0], lte: days[days.length - 1] } },
      include: { shiftTemplate: { select: { name: true, color: true, breakMins: true } } },
    }),
    loadAbsencesForDays(employeeIds, days),
  ]);
  const { alerts, alertCells, coverage } = await loadAlertsAndCoverage(
    employeeIds,
    employees,
    shifts,
    days,
    filterDepartmentIds.length === 1 ? filterDepartmentIds[0] : null
  );

  // Sem o nome do dia da semana no cabeçalho do PDF — com 28-31 colunas
  // numa página, "segunda, 14/09" por coluna não cabe de forma legível.
  const dayLabels = days.map((d) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }));
  const pdfRows: SchedulePdfRow[] = employees.map((e) => ({
    employeeName: `${e.firstName} ${e.lastName}`,
    employeeNumber: e.employeeNumber,
    cells: days.map((d) => pdfCellLabel(e.id, d, shifts, absences)),
  }));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <PeriodNav
            prevHref={`/escalas?view=month&month=${prevMonth}&${filterQuery}`}
            nextHref={`/escalas?view=month&month=${nextMonth}&${filterQuery}`}
            todayHref={`/escalas?view=month&${filterQuery}`}
            label={monthLabel}
          />
          <MonthYearPicker year={monthStart.getFullYear()} month={monthStart.getMonth()} filterQuery={filterQuery} />
          <PeriodStatusBadge shifts={shifts} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SchedulePdfButton
            title={`Escala mensal — ${monthLabel}`}
            subtitle={filterSubtitle(filterDepartmentIds, filterTeamIds, departments, teams)}
            weekDayLabels={dayLabels}
            rows={pdfRows}
            clientCompanyName={branding.clientCompanyName}
            clientCompanyLogo={branding.clientCompanyLogo}
          />
          {canEdit && <SendScheduleButton employeeIds={employeeIds} weekLabel={monthLabel} />}
        </div>
      </div>

      <ScheduleAlertsBanner alerts={alerts} />
      <FullscreenSection>
        <ScheduleGrid
          employees={employees}
          days={days}
          shifts={shifts}
          absences={absences}
          shiftTemplates={shiftTemplates}
          alertCells={alertCells}
          coverage={coverage ?? undefined}
          canEdit={canEdit}
        />
      </FullscreenSection>
      <StatusLegend />
    </>
  );
}
