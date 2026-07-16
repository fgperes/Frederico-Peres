import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getWeekStart, getWeekDays, isoDate, WEEKDAY_LABELS, addWeeksIso } from "@/lib/dates";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { HorariosTabs } from "./tabs";
import { ShiftCell } from "./shift-cell";
import { publishWeek, duplicateWeek } from "./actions";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const canEdit = canWrite(user.roles, "horarios");
  const scope = await employeeScopeWhere(user);

  const weekStart = getWeekStart(params.week);
  const weekStartIso = isoDate(weekStart);
  const days = getWeekDays(weekStart);
  const prevWeek = addWeeksIso(weekStartIso, -1);
  const nextWeek = addWeeksIso(weekStartIso, 1);

  const [employees, templates, shifts, absences] = await Promise.all([
    prisma.employee.findMany({
      where: { AND: [scope, { status: "ACTIVE" }] },
      orderBy: [{ lastName: "asc" }],
    }),
    prisma.shiftTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.shift.findMany({
      where: { date: { in: days } },
      include: { shiftTemplate: true },
    }),
    prisma.absence.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: days[6] },
        endDate: { gte: days[0] },
      },
    }),
  ]);

  const shiftMap = new Map<string, (typeof shifts)[number]>();
  for (const s of shifts) {
    shiftMap.set(`${s.employeeId}_${isoDate(s.date)}`, s);
  }

  function isAbsent(employeeId: string, date: Date) {
    return absences.some(
      (a) =>
        a.employeeId === employeeId &&
        a.startDate <= date &&
        a.endDate >= date
    );
  }

  const publishedCount = shifts.filter((s) => s.status === "PUBLISHED").length;
  const draftCount = shifts.filter((s) => s.status === "DRAFT").length;

  return (
    <div>
      <PageHeader
        icon={CalendarClock}
        title="Módulo de Horários"
        description="Gestão de escalas — modelo manual, cíclico e preditivo."
      />
      <HorariosTabs />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/horarios?week=${prevWeek}`}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-white"
          >
            ← Semana anterior
          </Link>
          <span className="px-2 text-sm font-medium text-stone-700">
            Semana de {weekStart.toLocaleDateString("pt-PT")}
          </span>
          <Link
            href={`/horarios?week=${nextWeek}`}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-white"
          >
            Semana seguinte →
          </Link>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Badge color="amber">{draftCount} rascunho</Badge>
            <Badge color="green">{publishedCount} publicado</Badge>
            <form action={duplicateWeek.bind(null, prevWeek, weekStartIso)}>
              <button
                type="submit"
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-white"
              >
                Duplicar semana anterior
              </button>
            </form>
            <form action={publishWeek.bind(null, weekStartIso, undefined)}>
              <button
                type="submit"
                className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
              >
                Publicar semana
              </button>
            </form>
          </div>
        )}
      </div>

      <Card className="overflow-x-auto p-0">
        {employees.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Sem colaboradores visíveis para agendar." />
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
                    const absent = isAbsent(e.id, d);
                    return (
                      <td key={i} className="px-2 py-2">
                        {absent ? (
                          <div className="rounded bg-rose-50 px-1 py-1 text-center text-[11px] text-rose-600">
                            Ausência
                          </div>
                        ) : (
                          <ShiftCell
                            employeeId={e.id}
                            date={isoDate(d)}
                            shiftId={shift?.id}
                            currentTemplateId={shift?.shiftTemplateId}
                            templates={templates}
                            disabled={!canEdit}
                          />
                        )}
                        {shift && (
                          <div className="mt-1 text-center">
                            <Badge color={shift.status === "PUBLISHED" ? "green" : "amber"}>
                              {shift.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
                            </Badge>
                          </div>
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
