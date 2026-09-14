import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getWeekStart, getWeekDays, isoDate, WEEKDAY_LABELS, addWeeksIso } from "@/lib/dates";
import { computeWorkedHoursByDay } from "@/lib/hours";
import { shiftDurationHours } from "@/lib/schedule";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { PicagensTabs } from "../tabs";
import { EditableHoursCell } from "./editable-hours-cell";
import { Fingerprint, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

export default async function ExecucaoPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; departmentId?: string; employeeId?: string }>;
}) {
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "picagens");
  const scope = await employeeScopeWhere(user);
  const params = await searchParams;

  const weekStart = getWeekStart(params.week);
  const weekStartIso = isoDate(weekStart);
  const weekDays = getWeekDays(weekStart);
  const weekEnd = new Date(weekDays[6]);
  weekEnd.setHours(23, 59, 59, 999);
  const prevWeek = addWeeksIso(weekStartIso, -1);
  const nextWeek = addWeeksIso(weekStartIso, 1);
  const filterQuery = `departmentId=${params.departmentId ?? ""}&employeeId=${params.employeeId ?? ""}`;

  const employeeWhere: Prisma.EmployeeWhereInput = canEdit
    ? {
        AND: [
          scope,
          { status: "ACTIVE" },
          params.departmentId ? { departmentId: params.departmentId } : {},
          params.employeeId ? { id: params.employeeId } : {},
        ],
      }
    : { id: user.employeeId ?? "__none__" };

  const [employees, departments] = await Promise.all([
    prisma.employee.findMany({ where: employeeWhere, orderBy: { firstName: "asc" } }),
    canEdit ? prisma.department.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  const employeeIds = employees.map((e) => e.id);

  const [shifts, entries, corrections] = await Promise.all([
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
  ]);

  return (
    <div>
      <PageHeader
        icon={Fingerprint}
        title="Picagens"
        description="Comparação entre horas planeadas e horas realmente executadas."
      />
      <PicagensTabs showTerminais={canEdit} />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          {canEdit && (
            <form className="flex flex-wrap items-end gap-3" method="get">
              <input type="hidden" name="week" value={weekStartIso} />
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
              <button
                type="submit"
                className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
              >
                Filtrar
              </button>
            </form>
          )}

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
      </Card>

      {employees.length === 0 ? (
        <EmptyState message="Sem colaboradores para mostrar." />
      ) : (
        <div className="space-y-6">
          {employees.map((emp) => {
            const empShifts = shifts.filter((s) => s.employeeId === emp.id);
            const empEntries = entries.filter((e) => e.employeeId === emp.id);
            const empCorrections = corrections.filter((c) => c.employeeId === emp.id);
            const actualByDay = computeWorkedHoursByDay(empEntries);

            let totalScheduledRaw = 0;
            let totalActualRaw = 0;
            let totalScheduledCorrMin = 0;
            let totalActualCorrMin = 0;

            const rows = weekDays.map((day) => {
              const key = isoDate(day);
              const dayShift = empShifts.find((s) => isoDate(s.date) === key);
              const scheduledRaw = dayShift
                ? shiftDurationHours(dayShift.startTime, dayShift.endTime, dayShift.shiftTemplate?.breakMins ?? 0)
                : 0;
              const actualRaw = actualByDay.get(key) ?? 0;

              const scheduledCorrection = empCorrections.find((c) => isoDate(c.date) === key && c.field === "SCHEDULED");
              const actualCorrection = empCorrections.find((c) => isoDate(c.date) === key && c.field === "ACTUAL");
              const scheduledCorrMin = scheduledCorrection?.minutesDelta ?? 0;
              const actualCorrMin = actualCorrection?.minutesDelta ?? 0;

              totalScheduledRaw += scheduledRaw;
              totalActualRaw += actualRaw;
              totalScheduledCorrMin += scheduledCorrMin;
              totalActualCorrMin += actualCorrMin;

              return {
                day,
                key,
                scheduledRaw,
                actualRaw,
                scheduledCorrected: scheduledRaw + scheduledCorrMin / 60,
                actualCorrected: actualRaw + actualCorrMin / 60,
                hasScheduledCorrection: !!scheduledCorrection,
                hasActualCorrection: !!actualCorrection,
              };
            });

            const balanceRaw = totalActualRaw - totalScheduledRaw;
            const balanceCorrected =
              totalActualRaw + totalActualCorrMin / 60 - (totalScheduledRaw + totalScheduledCorrMin / 60);

            return (
              <Card key={emp.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {emp.firstName} {emp.lastName}
                  </h2>
                  <div className="flex gap-2 text-xs">
                    <Badge color={balanceRaw >= 0 ? "green" : "red"}>
                      Saldo picagens: {balanceRaw >= 0 ? "+" : ""}
                      {balanceRaw.toFixed(1)}h
                    </Badge>
                    <Badge color={balanceCorrected >= 0 ? "green" : "red"}>
                      Saldo com correções: {balanceCorrected >= 0 ? "+" : ""}
                      {balanceCorrected.toFixed(1)}h
                    </Badge>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
                      <tr>
                        <th className="py-2">Dia</th>
                        <th className="py-2 text-center">Previsto (escala)</th>
                        <th className="py-2 text-center">Real (picagens)</th>
                        <th className="py-2 text-center">Diferença</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {rows.map((r, i) => {
                        const diff = r.actualCorrected - r.scheduledCorrected;
                        return (
                          <tr key={r.key}>
                            <td className="py-2">
                              {WEEKDAY_LABELS[i]} {r.day.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}
                            </td>
                            <td className="py-2 text-center">
                              {canEdit ? (
                                <EditableHoursCell
                                  employeeId={emp.id}
                                  date={r.key}
                                  field="SCHEDULED"
                                  rawHours={r.scheduledRaw}
                                  correctedHours={r.scheduledCorrected}
                                  hasCorrection={r.hasScheduledCorrection}
                                />
                              ) : (
                                `${r.scheduledCorrected.toFixed(1)}h`
                              )}
                            </td>
                            <td className="py-2 text-center">
                              {canEdit ? (
                                <EditableHoursCell
                                  employeeId={emp.id}
                                  date={r.key}
                                  field="ACTUAL"
                                  rawHours={r.actualRaw}
                                  correctedHours={r.actualCorrected}
                                  hasCorrection={r.hasActualCorrection}
                                />
                              ) : (
                                `${r.actualCorrected.toFixed(1)}h`
                              )}
                            </td>
                            <td className="py-2 text-center">
                              <Badge color={diff >= 0 ? "green" : "red"}>
                                {diff >= 0 ? "+" : ""}
                                {diff.toFixed(1)}h
                              </Badge>
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
    </div>
  );
}
