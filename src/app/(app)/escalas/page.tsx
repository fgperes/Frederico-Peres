import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import {
  getWeekStart,
  getWeekDays,
  getMonthStart,
  getMonthGridDays,
  isoDate,
  WEEKDAY_LABELS,
  addWeeksIso,
  addMonthsIso,
} from "@/lib/dates";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { SendScheduleButton } from "./send-schedule-button";
import { GenerateSidebar } from "./generate-sidebar";
import { SchedulePdfButton, type SchedulePdfRow } from "@/components/schedule-pdf-button";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CalendarRange } from "lucide-react";

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

  const [employees, departments, teams] = await Promise.all([
    prisma.employee.findMany({ where: employeeWhere, orderBy: [{ lastName: "asc" }] }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
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

      <Card className="mb-6">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <input type="hidden" name="view" value={view} />
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Departamento</label>
            <select
              name="departmentId"
              defaultValue={params.departmentId ?? ""}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
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
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
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
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Colaborador</label>
            <select
              name="employeeId"
              defaultValue={params.employeeId ?? ""}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
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
            className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900"
          >
            Filtrar
          </button>
        </form>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row">
        {canEdit && (
          <GenerateSidebar
            departments={departments.map((d) => ({ id: d.id, name: d.name }))}
            employees={employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, departmentId: e.departmentId }))}
            defaultFrom={isoDate(getWeekStart(params.week))}
            defaultTo={isoDate(getWeekDays(getWeekStart(params.week))[6])}
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex overflow-hidden rounded-md border border-stone-300 dark:border-stone-700">
              <Link
                href={`/escalas?view=week&${filterQuery}`}
                className={`px-3 py-1.5 text-sm font-medium ${view === "week" ? "bg-stone-800 text-white" : "bg-white text-stone-600 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-300"}`}
              >
                Semana
              </Link>
              <Link
                href={`/escalas?view=month&${filterQuery}`}
                className={`px-3 py-1.5 text-sm font-medium ${view === "month" ? "bg-stone-800 text-white" : "bg-white text-stone-600 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-300"}`}
              >
                Mês
              </Link>
            </div>
          </div>

          {view === "week" ? (
            <WeekView
              params={params}
              filterQuery={filterQuery}
              employees={employees}
              employeeIds={employeeIds}
              departments={departments}
              teams={teams}
              canEdit={canEdit}
            />
          ) : (
            <MonthView params={params} filterQuery={filterQuery} employeeIds={employeeIds} />
          )}
        </div>
      </div>
    </div>
  );
}

async function WeekView({
  params,
  filterQuery,
  employees,
  employeeIds,
  departments,
  teams,
  canEdit,
}: {
  params: { week?: string; departmentId?: string; teamId?: string };
  filterQuery: string;
  employees: { id: string; firstName: string; lastName: string }[];
  employeeIds: string[];
  departments: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  canEdit: boolean;
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
  const shiftMap = new Map<string, (typeof shifts)[number]>();
  for (const s of shifts) shiftMap.set(`${s.employeeId}_${isoDate(s.date)}`, s);

  const pdfRows: SchedulePdfRow[] = employees.map((e) => ({
    employeeName: `${e.firstName} ${e.lastName}`,
    cells: days.map((d) => {
      const shift = shiftMap.get(`${e.id}_${isoDate(d)}`);
      return shift ? `${shift.startTime}-${shift.endTime}` : "—";
    }),
  }));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/escalas?view=week&week=${prevWeek}&${filterQuery}`}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-white dark:border-stone-700 dark:hover:bg-stone-800"
          >
            ← Semana anterior
          </Link>
          <span className="px-2 text-sm font-medium text-stone-700 dark:text-stone-300">Semana de {weekLabel}</span>
          <Link
            href={`/escalas?view=week&week=${nextWeek}&${filterQuery}`}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-white dark:border-stone-700 dark:hover:bg-stone-800"
          >
            Semana seguinte →
          </Link>
        </div>

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
          />
          {canEdit && <SendScheduleButton employeeIds={employeeIds} weekLabel={weekLabel} />}
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        {employees.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Sem colaboradores visíveis para os filtros selecionados." />
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
              <tr>
                <th className="sticky left-0 bg-white px-4 py-3 dark:bg-stone-900">Colaborador</th>
                {days.map((d, i) => (
                  <th key={i} className="px-2 py-3 text-center">
                    {WEEKDAY_LABELS[i]}
                    <div className="font-normal normal-case text-stone-500">
                      {d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="sticky left-0 bg-white px-4 py-2 font-medium text-stone-800 dark:bg-stone-900 dark:text-stone-200">
                    {e.firstName} {e.lastName}
                  </td>
                  {days.map((d, i) => {
                    const shift = shiftMap.get(`${e.id}_${isoDate(d)}`);
                    return (
                      <td key={i} className="px-2 py-2 text-center">
                        {shift ? (
                          <Badge color={shift.status === "PUBLISHED" ? "green" : "amber"}>
                            {shift.startTime}-{shift.endTime}
                          </Badge>
                        ) : (
                          <span className="text-xs text-stone-400">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="mt-2 flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
        <span className="flex items-center gap-1">
          <Badge color="amber">rascunho</Badge> por publicar
        </span>
        <span className="flex items-center gap-1">
          <Badge color="green">publicado</Badge> imutável
        </span>
      </p>
    </>
  );
}

async function MonthView({
  params,
  filterQuery,
  employeeIds,
}: {
  params: { month?: string };
  filterQuery: string;
  employeeIds: string[];
}) {
  const monthStart = getMonthStart(params.month);
  const monthStartIso = isoDate(monthStart);
  const gridDays = getMonthGridDays(monthStart);
  const prevMonth = addMonthsIso(monthStartIso, -1);
  const nextMonth = addMonthsIso(monthStartIso, 1);
  const monthLabel = monthStart.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

  const shifts = await prisma.shift.findMany({
    where: { employeeId: { in: employeeIds }, date: { gte: gridDays[0], lte: gridDays[gridDays.length - 1] } },
  });

  const byDay = new Map<string, { draft: number; published: number }>();
  for (const s of shifts) {
    const key = isoDate(s.date);
    const entry = byDay.get(key) ?? { draft: 0, published: 0 };
    if (s.status === "PUBLISHED") entry.published++;
    else entry.draft++;
    byDay.set(key, entry);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < gridDays.length; i += 7) weeks.push(gridDays.slice(i, i + 7));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/escalas?view=month&month=${prevMonth}&${filterQuery}`}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-white dark:border-stone-700 dark:hover:bg-stone-800"
          >
            ← Mês anterior
          </Link>
          <span className="px-2 text-sm font-medium capitalize text-stone-700 dark:text-stone-300">{monthLabel}</span>
          <Link
            href={`/escalas?view=month&month=${nextMonth}&${filterQuery}`}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-white dark:border-stone-700 dark:hover:bg-stone-800"
          >
            Mês seguinte →
          </Link>
        </div>
      </div>

      <Card className="overflow-x-auto p-3">
        <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              {WEEKDAY_LABELS.map((label) => (
                <th key={label} className="pb-1 text-center text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  {label.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((day) => {
                  const key = isoDate(day);
                  const inMonth = day.getMonth() === monthStart.getMonth();
                  const counts = byDay.get(key);
                  return (
                    <td key={key} className="align-top p-0">
                      <Link
                        href={`/escalas?view=week&week=${key}&${filterQuery}`}
                        className={`block h-20 rounded-lg border p-1.5 text-left transition-colors hover:border-violet-400 ${
                          inMonth
                            ? "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
                            : "border-stone-100 bg-stone-50/50 text-stone-400 dark:border-stone-900 dark:bg-stone-950"
                        }`}
                      >
                        <span className="text-xs font-medium">{day.getDate()}</span>
                        {counts && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {counts.published > 0 && <Badge color="green">{counts.published}</Badge>}
                            {counts.draft > 0 && <Badge color="amber">{counts.draft}</Badge>}
                          </div>
                        )}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
