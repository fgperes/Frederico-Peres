import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import {
  getWeekStart,
  getWeekDays,
  isoDate,
  WEEKDAY_LABELS,
  MONTH_LABELS,
  addWeeksIso,
  getMonthStart,
  getMonthDays,
} from "@/lib/dates";
import { computeWorkedHoursByDay } from "@/lib/hours";
import { getDayClockTimes, type DayClockTimes } from "@/lib/time-clock";
import { shiftDurationHours } from "@/lib/schedule";
import { getModuleSubscription } from "@/lib/subscriptions";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { EmployeeTreeFilter, type TreeEmployee } from "@/components/employee-tree-filter";
import { PicagensTabs } from "../tabs";
import { EditableHoursCell } from "./editable-hours-cell";
import { TimeClockDecisionCell } from "./time-clock-decision-cell";
import { ToleranceControl } from "./tolerance-control";
import { Fingerprint, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Shift, ShiftTemplate, TimeClockEntry, HoursCorrection, TimeClockDayDecision } from "@prisma/client";

function parseIdList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function formatScheduled(shift: (Shift & { shiftTemplate: ShiftTemplate | null }) | undefined): string {
  if (!shift) return "—";
  const breakMins = shift.shiftTemplate?.breakMins ?? 0;
  return breakMins > 0
    ? `${shift.startTime} → ${shift.endTime} (pausa ${breakMins}min)`
    : `${shift.startTime} → ${shift.endTime}`;
}

function formatActual(t: DayClockTimes): string {
  if (!t.clockIn && !t.clockOut) return "—";
  const main = `${t.clockIn ?? "?"} → ${t.clockOut ?? "?"}`;
  return t.breakStart || t.breakEnd ? `${main} (almoço ${t.breakStart ?? "?"}–${t.breakEnd ?? "?"})` : main;
}

type DayRow = {
  day: Date;
  key: string;
  scheduledLabel: string;
  actualLabel: string;
  actualRaw: number;
  actualCorrected: number;
  hasActualCorrection: boolean;
  diffMinutes: number;
};

// O previsto vem sempre e só da escala — não é editável à mão. Sem turno
// marcado nesse dia não há nada a comparar, por isso o saldo fica a 0
// (não entra como desvio por decidir), mesmo que haja picagens registadas.
function buildRows(
  days: Date[],
  empShifts: (Shift & { shiftTemplate: ShiftTemplate | null })[],
  empEntries: TimeClockEntry[],
  empCorrections: HoursCorrection[]
): DayRow[] {
  const actualByDay = computeWorkedHoursByDay(empEntries);

  return days.map((day) => {
    const key = isoDate(day);
    const dayShift = empShifts.find((s) => isoDate(s.date) === key);
    const dayEntries = empEntries.filter((e) => isoDate(e.timestamp) === key);
    const scheduledRaw = dayShift
      ? shiftDurationHours(dayShift.startTime, dayShift.endTime, dayShift.shiftTemplate?.breakMins ?? 0)
      : 0;
    const actualRaw = actualByDay.get(key) ?? 0;

    const actualCorrection = empCorrections.find((c) => isoDate(c.date) === key && c.field === "ACTUAL");
    const actualCorrMin = actualCorrection?.minutesDelta ?? 0;
    const actualCorrected = actualRaw + actualCorrMin / 60;

    return {
      day,
      key,
      scheduledLabel: formatScheduled(dayShift),
      actualLabel: formatActual(getDayClockTimes(dayEntries)),
      actualRaw,
      actualCorrected,
      hasActualCorrection: !!actualCorrection,
      diffMinutes: dayShift ? Math.round((actualCorrected - scheduledRaw) * 60) : 0,
    };
  });
}

export default async function ExecucaoPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    month?: string;
    year?: string;
    employees?: string;
  }>;
}) {
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "picagens");
  const params = await searchParams;
  const subscription = await getModuleSubscription();
  const toleranceMinutes = subscription.timeClockToleranceMinutes;

  return (
    <div>
      <PageHeader
        icon={Fingerprint}
        title="Picagens"
        description="Comparação entre horas planeadas e horas realmente executadas."
      />
      <PicagensTabs showTerminais={canEdit} />

      {canEdit ? (
        <GestorExecucaoView user={user} params={params} toleranceMinutes={toleranceMinutes} />
      ) : (
        <ColaboradorExecucaoView user={user} params={params} />
      )}
    </div>
  );
}

async function GestorExecucaoView({
  user,
  params,
  toleranceMinutes,
}: {
  user: Awaited<ReturnType<typeof requireUser>>;
  params: { week?: string; month?: string; year?: string; employees?: string };
  toleranceMinutes: number;
}) {
  const scope = await employeeScopeWhere(user);

  const monthYearBase =
    params.month && params.year
      ? isoDate(new Date(Number(params.year), Number(params.month) - 1, 1))
      : params.week;
  const weekStart = getWeekStart(monthYearBase);
  const weekStartIso = isoDate(weekStart);
  const weekDays = getWeekDays(weekStart);
  const weekEnd = new Date(weekDays[6]);
  weekEnd.setHours(23, 59, 59, 999);
  const prevWeek = addWeeksIso(weekStartIso, -1);
  const nextWeek = addWeeksIso(weekStartIso, 1);

  const selectedEmployeeIds = parseIdList(params.employees);
  const filterQuery = `employees=${selectedEmployeeIds.join(",")}`;

  const [departments, teams, scopedEmployees] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { AND: [scope, { status: "ACTIVE" }] },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, departmentId: true, teamId: true },
    }),
  ]);

  const employees =
    selectedEmployeeIds.length > 0
      ? scopedEmployees.filter((e) => selectedEmployeeIds.includes(e.id))
      : scopedEmployees;
  const employeeIds = employees.map((e) => e.id);

  const employeeTreeItems: TreeEmployee[] = scopedEmployees.map((e) => ({
    id: e.id,
    name: `${e.firstName} ${e.lastName}`,
    departmentId: e.departmentId,
    teamId: e.teamId,
  }));

  const [shifts, entries, corrections, decisions] = await Promise.all([
    prisma.shift.findMany({
      where: { employeeId: { in: employeeIds }, date: { gte: weekStart, lte: weekEnd }, status: "PUBLISHED" },
      include: { shiftTemplate: true },
    }),
    prisma.timeClockEntry.findMany({
      where: { employeeId: { in: employeeIds }, timestamp: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.hoursCorrection.findMany({
      where: { employeeId: { in: employeeIds }, date: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.timeClockDayDecision.findMany({
      where: { employeeId: { in: employeeIds }, date: { gte: weekStart, lte: weekEnd } },
    }),
  ]);

  const decisionByKey = new Map<string, TimeClockDayDecision>();
  for (const d of decisions) decisionByKey.set(`${d.employeeId}_${isoDate(d.date)}`, d);

  return (
    <>
      <Card className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <form key={weekStartIso} className="flex flex-wrap items-end gap-3" method="get">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Mês</label>
              <select
                name="month"
                defaultValue={weekStart.getMonth() + 1}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
              >
                {MONTH_LABELS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Ano</label>
              <select
                name="year"
                defaultValue={weekStart.getFullYear()}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                Departamento / Equipa / Colaborador
              </label>
              <EmployeeTreeFilter
                departments={departments}
                teams={teams}
                employees={employeeTreeItems}
                initialSelected={selectedEmployeeIds}
                fieldName="employees"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            >
              Filtrar
            </button>
          </form>

          <div className="flex items-center gap-1">
            <Link
              href={`/picagens/execucao?week=${prevWeek}&${filterQuery}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <ChevronLeft size={15} />
            </Link>
            <span className="min-w-[200px] px-2 text-center text-sm font-semibold text-stone-800 dark:text-stone-200">
              Semana de {weekStart.toLocaleDateString("pt-PT")} a {weekDays[6].toLocaleDateString("pt-PT")}
            </span>
            <Link
              href={`/picagens/execucao?week=${nextWeek}&${filterQuery}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>

        <div className="mt-4 border-t border-stone-100 pt-4 dark:border-stone-800">
          <ToleranceControl minutes={toleranceMinutes} />
        </div>
      </Card>

      {employees.length === 0 ? (
        <EmptyState message="Sem colaboradores para mostrar." />
      ) : (
        <div className="space-y-6">
          {employees.map((emp) => {
            const empShifts = shifts.filter((s) => s.employeeId === emp.id);
            const empEntries = entries.filter((e) => e.employeeId === emp.id);
            const empCorrections = corrections.filter((c) => c.employeeId === emp.id);
            const rows = buildRows(weekDays, empShifts, empEntries, empCorrections);

            const balanceCorrected = rows.reduce((sum, r) => sum + r.diffMinutes, 0) / 60;

            return (
              <Card key={emp.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {emp.firstName} {emp.lastName}
                  </h2>
                  <Badge color={balanceCorrected >= 0 ? "green" : "red"}>
                    Saldo da semana: {balanceCorrected >= 0 ? "+" : ""}
                    {balanceCorrected.toFixed(1)}h
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
                      <tr>
                        <th className="py-2">Dia</th>
                        <th className="py-2 text-center">Previsto (escala)</th>
                        <th className="py-2 text-center">Real (picagens)</th>
                        <th className="py-2 text-center">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {rows.map((r, i) => {
                        const decision = decisionByKey.get(`${emp.id}_${r.key}`);
                        const needsDecision = Math.abs(r.diffMinutes) > toleranceMinutes;
                        return (
                          <tr key={r.key}>
                            <td className="py-2">
                              {WEEKDAY_LABELS[i]} {r.day.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}
                            </td>
                            <td className="py-2 text-center text-stone-700 dark:text-stone-300">
                              {r.scheduledLabel}
                            </td>
                            <td className="py-2 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-stone-700 dark:text-stone-300">{r.actualLabel}</span>
                                <EditableHoursCell
                                  employeeId={emp.id}
                                  date={r.key}
                                  field="ACTUAL"
                                  rawHours={r.actualRaw}
                                  correctedHours={r.actualCorrected}
                                  hasCorrection={r.hasActualCorrection}
                                />
                              </div>
                            </td>
                            <td className="py-2 text-center">
                              {needsDecision || decision ? (
                                <TimeClockDecisionCell
                                  employeeId={emp.id}
                                  date={r.key}
                                  diffMinutes={r.diffMinutes}
                                  diffHours={r.diffMinutes / 60}
                                  existingDecision={decision ? { decisionType: decision.decisionType } : null}
                                />
                              ) : (
                                <Badge color={r.diffMinutes >= 0 ? "green" : "red"}>
                                  {r.diffMinutes >= 0 ? "+" : ""}
                                  {(r.diffMinutes / 60).toFixed(1)}h
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

async function ColaboradorExecucaoView({
  user,
  params,
}: {
  user: Awaited<ReturnType<typeof requireUser>>;
  params: { month?: string; year?: string };
}) {
  if (!user.employeeId) {
    return <EmptyState message="Não existe uma ficha de colaborador associada à sua conta." />;
  }

  const now = new Date();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;
  const year = params.year ? Number(params.year) : now.getFullYear();
  const monthStart = getMonthStart(isoDate(new Date(year, month - 1, 1)));
  const monthDays = getMonthDays(monthStart);
  const monthEnd = new Date(monthDays[monthDays.length - 1]);
  monthEnd.setHours(23, 59, 59, 999);

  const [shifts, entries, corrections, decisions] = await Promise.all([
    prisma.shift.findMany({
      where: { employeeId: user.employeeId, date: { gte: monthStart, lte: monthEnd }, status: "PUBLISHED" },
      include: { shiftTemplate: true },
    }),
    prisma.timeClockEntry.findMany({
      where: { employeeId: user.employeeId, timestamp: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.hoursCorrection.findMany({
      where: { employeeId: user.employeeId, date: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.timeClockDayDecision.findMany({
      where: { employeeId: user.employeeId, date: { gte: monthStart, lte: monthEnd } },
    }),
  ]);

  const decisionByKey = new Map<string, TimeClockDayDecision>();
  for (const d of decisions) decisionByKey.set(isoDate(d.date), d);

  const rows = buildRows(monthDays, shifts, entries, corrections);
  const balanceCorrected = rows.reduce((sum, r) => sum + r.diffMinutes, 0) / 60;

  const DECISION_LABELS: Record<string, string> = {
    DEDUCTION: "Desconto",
    POOL: "Bolsa de horas",
    JUSTIFIED: "Justificado",
    OVERTIME: "Hora extra",
  };

  return (
    <>
      <Card className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Mês</label>
              <select
                name="month"
                defaultValue={month}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
              >
                {MONTH_LABELS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Ano</label>
              <select
                name="year"
                defaultValue={year}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            >
              Filtrar
            </button>
          </form>
          <Badge color={balanceCorrected >= 0 ? "green" : "red"}>
            Saldo do mês: {balanceCorrected >= 0 ? "+" : ""}
            {balanceCorrected.toFixed(1)}h
          </Badge>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
            <tr>
              <th className="px-4 py-3">Dia</th>
              <th className="px-4 py-3 text-center">Previsto (escala)</th>
              <th className="px-4 py-3 text-center">Real (picagens)</th>
              <th className="px-4 py-3 text-center">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {rows.map((r) => {
              const decision = decisionByKey.get(r.key);
              return (
                <tr key={r.key}>
                  <td className="px-4 py-3">{r.day.toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "2-digit" })}</td>
                  <td className="px-4 py-3 text-center text-stone-700 dark:text-stone-300">{r.scheduledLabel}</td>
                  <td className="px-4 py-3 text-center text-stone-700 dark:text-stone-300">{r.actualLabel}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Badge color={r.diffMinutes >= 0 ? "green" : "red"}>
                        {r.diffMinutes >= 0 ? "+" : ""}
                        {(r.diffMinutes / 60).toFixed(1)}h
                      </Badge>
                      {decision && <Badge color="blue">{DECISION_LABELS[decision.decisionType] ?? decision.decisionType}</Badge>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
