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
import { SchedulePdfButton, type SchedulePdfRow } from "@/components/schedule-pdf-button";
import { getDocumentBranding } from "@/lib/document-branding";
import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";

export default async function EscalasPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    week?: string;
    month?: string;
    departmentId?: string;
    teamId?: string;
    employeeId?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const canEdit = canWrite(user.roles, "horarios");
  const scope = await employeeScopeWhere(user);
  const view = params.view === "month" ? "month" : "week";

  const employeeWhere: Prisma.EmployeeWhereInput = {
    AND: [
      scope,
      { status: "ACTIVE" },
      params.departmentId ? { departmentId: params.departmentId } : {},
      params.teamId ? { teamId: params.teamId } : {},
      params.employeeId ? { id: params.employeeId } : {},
    ],
  };

  const [employees, departments, teams, branding] = await Promise.all([
    prisma.employee.findMany({ where: employeeWhere, orderBy: [{ lastName: "asc" }] }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    getDocumentBranding(),
  ]);
  const employeeIds = employees.map((e) => e.id);

  const filterQuery = `departmentId=${params.departmentId ?? ""}&teamId=${params.teamId ?? ""}&employeeId=${params.employeeId ?? ""}`;

  return (
    <div>
      <PageHeader
        icon={CalendarRange}
        title="Escalas"
        description="Geração, publicação e consulta de escalas, por semana ou por mês."
      />

      <Card className="mb-6 bg-gradient-to-br from-white to-stone-50 dark:from-stone-900 dark:to-stone-950">
        <form className="flex flex-wrap items-end justify-between gap-4" method="get">
          <div className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="view" value={view} />
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                Departamento
              </label>
              <select
                name="departmentId"
                defaultValue={params.departmentId ?? ""}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
              >
                <option value="">Todos</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Equipa</label>
              <select
                name="teamId"
                defaultValue={params.teamId ?? ""}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
              >
                <option value="">Todas</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                Colaborador
              </label>
              <select
                name="employeeId"
                defaultValue={params.employeeId ?? ""}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
              >
                <option value="">Todos</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
                  </option>
                ))}
              </select>
            </div>
            {view === "week" && <input type="hidden" name="week" value={params.week ?? ""} />}
            {view === "month" && <input type="hidden" name="month" value={params.month ?? ""} />}
            <button
              type="submit"
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            >
              Filtrar
            </button>
          </div>

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
        </form>
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
        />
      )}
    </div>
  );
}

function PeriodNav({ prevHref, nextHref, label }: { prevHref: string; nextHref: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={prevHref}
        prefetch={false}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        <ChevronLeft size={15} />
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

function StatusLegend() {
  return (
    <p className="mt-3 flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
      <span className="flex items-center gap-1">
        <Badge color="amber">rascunho</Badge> por publicar
      </span>
      <span className="flex items-center gap-1">
        <Badge color="green">publicado</Badge> imutável
      </span>
      <span className="flex items-center gap-1">
        <Badge color="blue">férias</Badge> / <Badge color="slate">outra ausência</Badge>
      </span>
      <span className="flex items-center gap-1 italic text-stone-400 dark:text-stone-600">Folga — dia de descanso do ciclo</span>
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

// Dias de folga planeada pelo ciclo de horário atribuído (célula
// isDayOff) — mesmo cálculo de semana/dia do ciclo usado em
// generateSchedulesForEmployees, só para leitura. Colaboradores sem ciclo
// (módulo preditivo) não têm folgas fixas para mostrar aqui: emergem da
// própria geração, não de um padrão à parte.
async function loadRestDaysForDays(employeeIds: string[], days: Date[]) {
  if (employeeIds.length === 0 || days.length === 0) return [];

  const assignments = await prisma.scheduleCycleAssignment.findMany({
    where: { employeeId: { in: employeeIds }, cycle: { isTemplate: false } },
    include: { cycle: { include: { pattern: true } } },
  });

  const entries: { employeeId: string; date: Date }[] = [];
  for (const assignment of assignments) {
    const cycle = assignment.cycle;
    for (const day of days) {
      const daysSinceStart = differenceInCalendarDays(day, cycle.startDate);
      if (daysSinceStart < 0) continue;
      const weekOffset = Math.floor(daysSinceStart / 7) + assignment.offsetWeeks;
      const cycleWeekIndex = ((weekOffset % cycle.weeks) + cycle.weeks) % cycle.weeks;
      const dow = day.getDay();
      const cell = cycle.pattern.find((p) => p.weekIndex === cycleWeekIndex && p.dayOfWeek === dow);
      if (cell?.isDayOff) entries.push({ employeeId: assignment.employeeId, date: day });
    }
  }
  return entries;
}

// Sigla curta para o PDF do horário (a afixar) — "F" para folga, 3 letras
// maiúsculas do tipo de ausência (ex.: "Férias" -> "FÉR", "Baixa Médica" ->
// "BAI"). Sem isto, um dia de folga/férias ficava indistinguível de um dia
// simplesmente sem horário gerado no documento impresso.
function pdfCellLabel(
  employeeId: string,
  day: Date,
  shifts: { employeeId: string; date: Date; startTime: string; endTime: string }[],
  absences: { employeeId: string; date: Date; label: string }[],
  restDays: { employeeId: string; date: Date }[]
): string {
  const dayIso = isoDate(day);
  const shift = shifts.find((s) => s.employeeId === employeeId && isoDate(s.date) === dayIso);
  if (shift) return `${shift.startTime}-${shift.endTime}`;
  const absence = absences.find((a) => a.employeeId === employeeId && isoDate(a.date) === dayIso);
  if (absence) return absence.label.slice(0, 3).toUpperCase();
  const isRestDay = restDays.some((r) => r.employeeId === employeeId && isoDate(r.date) === dayIso);
  if (isRestDay) return "F";
  return "—";
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
}: {
  params: { week?: string; departmentId?: string; teamId?: string };
  filterQuery: string;
  employees: { id: string; firstName: string; lastName: string; employeeNumber: string | null; weeklyHours: number }[];
  employeeIds: string[];
  departments: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  canEdit: boolean;
  branding: Branding;
}) {
  const weekStart = getWeekStart(params.week);
  const weekStartIso = isoDate(weekStart);
  const days = getWeekDays(weekStart);
  const prevWeek = addWeeksIso(weekStartIso, -1);
  const nextWeek = addWeeksIso(weekStartIso, 1);
  const weekLabel = `${weekStart.toLocaleDateString("pt-PT")} a ${days[6].toLocaleDateString("pt-PT")}`;

  const [shifts, absences, restDays] = await Promise.all([
    prisma.shift.findMany({
      where: { employeeId: { in: employeeIds }, date: { in: days } },
    }),
    loadAbsencesForDays(employeeIds, days),
    loadRestDaysForDays(employeeIds, days),
  ]);

  const pdfRows: SchedulePdfRow[] = employees.map((e) => ({
    employeeName: `${e.firstName} ${e.lastName}`,
    employeeNumber: e.employeeNumber,
    cells: days.map((d) => pdfCellLabel(e.id, d, shifts, absences, restDays)),
  }));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PeriodNav
          prevHref={`/escalas?view=week&week=${prevWeek}&${filterQuery}`}
          nextHref={`/escalas?view=week&week=${nextWeek}&${filterQuery}`}
          label={`Semana de ${weekLabel}`}
        />

        <div className="flex flex-wrap items-center gap-2">
          <SchedulePdfButton
            title={`Escala semanal — ${weekLabel}`}
            subtitle={
              [
                params.departmentId ? departments.find((d) => d.id === params.departmentId)?.name : null,
                params.teamId ? teams.find((t) => t.id === params.teamId)?.name : null,
              ]
                .filter(Boolean)
                .join(" / ") || "Todos os departamentos"
            }
            weekDayLabels={WEEKDAY_LABELS}
            rows={pdfRows}
            clientCompanyName={branding.clientCompanyName}
            clientCompanyLogo={branding.clientCompanyLogo}
          />
          {canEdit && <SendScheduleButton employeeIds={employeeIds} weekLabel={weekLabel} />}
        </div>
      </div>

      <ScheduleGrid employees={employees} days={days} shifts={shifts} absences={absences} restDays={restDays} />
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
}: {
  params: { month?: string; departmentId?: string; teamId?: string };
  filterQuery: string;
  employees: { id: string; firstName: string; lastName: string; employeeNumber: string | null; weeklyHours: number }[];
  employeeIds: string[];
  departments: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  canEdit: boolean;
  branding: Branding;
}) {
  const monthStart = getMonthStart(params.month);
  const monthStartIso = isoDate(monthStart);
  const days = getMonthDays(monthStart);
  const prevMonth = addMonthsIso(monthStartIso, -1);
  const nextMonth = addMonthsIso(monthStartIso, 1);
  const monthLabel = monthStart.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

  const [shifts, absences, restDays] = await Promise.all([
    prisma.shift.findMany({
      where: { employeeId: { in: employeeIds }, date: { gte: days[0], lte: days[days.length - 1] } },
    }),
    loadAbsencesForDays(employeeIds, days),
    loadRestDaysForDays(employeeIds, days),
  ]);

  // Sem o nome do dia da semana no cabeçalho do PDF — com 28-31 colunas
  // numa página, "segunda, 14/09" por coluna não cabe de forma legível.
  const dayLabels = days.map((d) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }));
  const pdfRows: SchedulePdfRow[] = employees.map((e) => ({
    employeeName: `${e.firstName} ${e.lastName}`,
    employeeNumber: e.employeeNumber,
    cells: days.map((d) => pdfCellLabel(e.id, d, shifts, absences, restDays)),
  }));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <PeriodNav
            prevHref={`/escalas?view=month&month=${prevMonth}&${filterQuery}`}
            nextHref={`/escalas?view=month&month=${nextMonth}&${filterQuery}`}
            label={monthLabel}
          />
          <MonthYearPicker year={monthStart.getFullYear()} month={monthStart.getMonth()} filterQuery={filterQuery} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SchedulePdfButton
            title={`Escala mensal — ${monthLabel}`}
            subtitle={
              [
                params.departmentId ? departments.find((d) => d.id === params.departmentId)?.name : null,
                params.teamId ? teams.find((t) => t.id === params.teamId)?.name : null,
              ]
                .filter(Boolean)
                .join(" / ") || "Todos os departamentos"
            }
            weekDayLabels={dayLabels}
            rows={pdfRows}
            clientCompanyName={branding.clientCompanyName}
            clientCompanyLogo={branding.clientCompanyLogo}
          />
          {canEdit && <SendScheduleButton employeeIds={employeeIds} weekLabel={monthLabel} />}
        </div>
      </div>

      <ScheduleGrid employees={employees} days={days} shifts={shifts} absences={absences} restDays={restDays} />
      <StatusLegend />
    </>
  );
}
