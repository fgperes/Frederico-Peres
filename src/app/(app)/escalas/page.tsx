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
import { SchedulePdfButton, type SchedulePdfRow } from "@/components/schedule-pdf-button";
import { getDocumentBranding } from "@/lib/document-branding";
import Link from "next/link";
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
        className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        <ChevronLeft size={15} />
      </Link>
      <span className="min-w-[180px] px-2 text-center text-sm font-semibold capitalize text-stone-800 dark:text-stone-200">
        {label}
      </span>
      <Link
        href={nextHref}
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
    </p>
  );
}

type Branding = { clientCompanyName: string | null; clientCompanyLogo: string | null };

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

  const shifts = await prisma.shift.findMany({
    where: { employeeId: { in: employeeIds }, date: { in: days } },
  });

  const pdfRows: SchedulePdfRow[] = employees.map((e) => ({
    employeeName: `${e.firstName} ${e.lastName}`,
    employeeNumber: e.employeeNumber,
    cells: days.map((d) => {
      const shift = shifts.find((s) => s.employeeId === e.id && isoDate(s.date) === isoDate(d));
      return shift ? `${shift.startTime}-${shift.endTime}` : "—";
    }),
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

      <ScheduleGrid employees={employees} days={days} shifts={shifts} />
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

  const shifts = await prisma.shift.findMany({
    where: { employeeId: { in: employeeIds }, date: { gte: days[0], lte: days[days.length - 1] } },
  });

  // Sem o nome do dia da semana no cabeçalho do PDF — com 28-31 colunas
  // numa página, "segunda, 14/09" por coluna não cabe de forma legível.
  const dayLabels = days.map((d) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }));
  const pdfRows: SchedulePdfRow[] = employees.map((e) => ({
    employeeName: `${e.firstName} ${e.lastName}`,
    employeeNumber: e.employeeNumber,
    cells: days.map((d) => {
      const shift = shifts.find((s) => s.employeeId === e.id && isoDate(s.date) === isoDate(d));
      return shift ? `${shift.startTime}-${shift.endTime}` : "—";
    }),
  }));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PeriodNav
          prevHref={`/escalas?view=month&month=${prevMonth}&${filterQuery}`}
          nextHref={`/escalas?view=month&month=${nextMonth}&${filterQuery}`}
          label={monthLabel}
        />

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

      <ScheduleGrid employees={employees} days={days} shifts={shifts} />
      <StatusLegend />
    </>
  );
}
