import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getWeekStart, getWeekDays, isoDate, WEEKDAY_LABELS, addWeeksIso } from "@/lib/dates";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { SendScheduleButton } from "./send-schedule-button";
import { SchedulePdfButton, type SchedulePdfRow } from "@/components/schedule-pdf-button";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CalendarRange } from "lucide-react";

export default async function EscalasPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    departmentId?: string;
    teamId?: string;
    employeeId?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const canSend = canWrite(user.roles, "horarios");
  const scope = await employeeScopeWhere(user);

  const weekStart = getWeekStart(params.week);
  const weekStartIso = isoDate(weekStart);
  const days = getWeekDays(weekStart);
  const prevWeek = addWeeksIso(weekStartIso, -1);
  const nextWeek = addWeeksIso(weekStartIso, 1);

  const employeeWhere: Prisma.EmployeeWhereInput = {
    AND: [
      scope,
      { status: "ACTIVE" },
      params.departmentId ? { departmentId: params.departmentId } : {},
      params.teamId ? { teamId: params.teamId } : {},
      params.employeeId ? { id: params.employeeId } : {},
    ],
  };

  const [employees, departments, teams, shifts] = await Promise.all([
    prisma.employee.findMany({
      where: employeeWhere,
      orderBy: [{ lastName: "asc" }],
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.shift.findMany({
      where: { date: { in: days }, status: "PUBLISHED" },
    }),
  ]);

  const shiftMap = new Map<string, (typeof shifts)[number]>();
  for (const s of shifts) {
    shiftMap.set(`${s.employeeId}_${isoDate(s.date)}`, s);
  }

  const employeeIds = employees.map((e) => e.id);
  const weekLabel = `${weekStart.toLocaleDateString("pt-PT")} a ${days[6].toLocaleDateString("pt-PT")}`;

  const pdfRows: SchedulePdfRow[] = employees.map((e) => ({
    employeeName: `${e.firstName} ${e.lastName}`,
    cells: days.map((d) => {
      const shift = shiftMap.get(`${e.id}_${isoDate(d)}`);
      return shift ? `${shift.startTime}-${shift.endTime}` : "—";
    }),
  }));

  return (
    <div>
      <PageHeader
        icon={CalendarRange}
        title="Escalas"
        description="Consulta de escalas publicadas, com filtros, envio aos colaboradores e template para afixação."
      />

      <Card className="mb-6">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Departamento
            </label>
            <select
              name="departmentId"
              defaultValue={params.departmentId ?? ""}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
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
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Equipa
            </label>
            <select
              name="teamId"
              defaultValue={params.teamId ?? ""}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
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
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Colaborador
            </label>
            <select
              name="employeeId"
              defaultValue={params.employeeId ?? ""}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
            >
              <option value="">Todos</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </div>
          <input type="hidden" name="week" value={weekStartIso} />
          <button
            type="submit"
            className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900"
          >
            Filtrar
          </button>
        </form>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/escalas?week=${prevWeek}&departmentId=${params.departmentId ?? ""}&teamId=${params.teamId ?? ""}&employeeId=${params.employeeId ?? ""}`}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-white"
          >
            ← Semana anterior
          </Link>
          <span className="px-2 text-sm font-medium text-stone-700">
            Semana de {weekLabel}
          </span>
          <Link
            href={`/escalas?week=${nextWeek}&departmentId=${params.departmentId ?? ""}&teamId=${params.teamId ?? ""}&employeeId=${params.employeeId ?? ""}`}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-white"
          >
            Semana seguinte →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SchedulePdfButton
            title={`Escala semanal — ${weekLabel}`}
            subtitle={
              [
                params.departmentId
                  ? departments.find((d) => d.id === params.departmentId)?.name
                  : null,
                params.teamId ? teams.find((t) => t.id === params.teamId)?.name : null,
              ]
                .filter(Boolean)
                .join(" / ") || "Todos os departamentos"
            }
            weekDayLabels={WEEKDAY_LABELS}
            rows={pdfRows}
          />
          {canSend && (
            <SendScheduleButton employeeIds={employeeIds} weekLabel={weekLabel} />
          )}
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        {employees.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Sem colaboradores visíveis para os filtros selecionados." />
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="sticky left-0 bg-white px-4 py-3">
                  Colaborador
                </th>
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
            <tbody className="divide-y divide-stone-100">
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="sticky left-0 bg-white px-4 py-2 font-medium text-stone-800">
                    {e.firstName} {e.lastName}
                  </td>
                  {days.map((d, i) => {
                    const shift = shiftMap.get(`${e.id}_${isoDate(d)}`);
                    return (
                      <td key={i} className="px-2 py-2 text-center">
                        {shift ? (
                          <Badge color="green">
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
    </div>
  );
}
