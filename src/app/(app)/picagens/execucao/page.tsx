import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getWeekStart, getWeekDays, isoDate, WEEKDAY_LABELS } from "@/lib/dates";
import { computeWorkedHoursByDay } from "@/lib/hours";
import { shiftDurationHours } from "@/lib/schedule";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { PicagensTabs } from "../tabs";
import { CorrectionForm } from "./correction-form";
import { Fingerprint } from "lucide-react";

export default async function ExecucaoPage() {
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "picagens");
  const scope = await employeeScopeWhere(user);

  const employees = canEdit
    ? await prisma.employee.findMany({ where: { ...scope, status: "ACTIVE" }, orderBy: { firstName: "asc" } })
    : user.employeeId
      ? await prisma.employee.findMany({ where: { id: user.employeeId } })
      : [];

  const weekStart = getWeekStart();
  const weekDays = getWeekDays(weekStart);
  const weekEnd = new Date(weekDays[6]);
  weekEnd.setHours(23, 59, 59, 999);
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

      {employees.length === 0 ? (
        <EmptyState message="Sem colaboradores para mostrar." />
      ) : (
        <div className="space-y-6">
          {employees.map((emp) => {
            const empShifts = shifts.filter((s) => s.employeeId === emp.id);
            const empEntries = entries.filter((e) => e.employeeId === emp.id);
            const empCorrections = corrections.filter((c) => c.employeeId === emp.id);
            const actualByDay = computeWorkedHoursByDay(empEntries);

            let totalScheduled = 0;
            let totalActualRaw = 0;
            let totalCorrectionMinutes = 0;

            const rows = weekDays.map((day) => {
              const key = isoDate(day);
              const dayShift = empShifts.find((s) => isoDate(s.date) === key);
              const scheduled = dayShift
                ? shiftDurationHours(dayShift.startTime, dayShift.endTime, dayShift.shiftTemplate?.breakMins ?? 0)
                : 0;
              const actualRaw = actualByDay.get(key) ?? 0;
              const dayCorrections = empCorrections.filter((c) => isoDate(c.date) === key);
              const correctionMinutes = dayCorrections.reduce((sum, c) => sum + c.minutesDelta, 0);

              totalScheduled += scheduled;
              totalActualRaw += actualRaw;
              totalCorrectionMinutes += correctionMinutes;

              return { day, key, scheduled, actualRaw, dayCorrections, correctionMinutes };
            });

            const balanceRaw = totalActualRaw - totalScheduled;
            const balanceCorrected = totalActualRaw + totalCorrectionMinutes / 60 - totalScheduled;

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
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
                      <tr>
                        <th className="py-2">Dia</th>
                        <th className="py-2">Previsto</th>
                        <th className="py-2">Real (picagens)</th>
                        <th className="py-2">Correção</th>
                        <th className="py-2">Diferença</th>
                        {canEdit && <th className="py-2"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {rows.map((r, i) => {
                        const diff = r.actualRaw + r.correctionMinutes / 60 - r.scheduled;
                        return (
                          <tr key={r.key}>
                            <td className="py-2">
                              {WEEKDAY_LABELS[i]} {r.day.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}
                            </td>
                            <td className="py-2">{r.scheduled.toFixed(1)}h</td>
                            <td className="py-2">{r.actualRaw.toFixed(1)}h</td>
                            <td className="py-2">
                              {r.correctionMinutes !== 0 ? (
                                <span className={r.correctionMinutes > 0 ? "text-emerald-600" : "text-rose-600"}>
                                  {r.correctionMinutes > 0 ? "+" : ""}
                                  {r.correctionMinutes}min
                                </span>
                              ) : (
                                "—"
                              )}
                              {r.dayCorrections.map((c) => (
                                <p key={c.id} className="text-[11px] text-stone-400">
                                  {c.reason}
                                </p>
                              ))}
                            </td>
                            <td className="py-2">
                              <Badge color={diff >= 0 ? "green" : "red"}>
                                {diff >= 0 ? "+" : ""}
                                {diff.toFixed(1)}h
                              </Badge>
                            </td>
                            {canEdit && (
                              <td className="py-2">
                                <CorrectionForm employeeId={emp.id} date={r.key} />
                              </td>
                            )}
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
