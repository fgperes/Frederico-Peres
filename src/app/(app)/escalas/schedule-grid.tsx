import { isoDate } from "@/lib/dates";
import { Badge, EmptyState } from "@/components/ui";

export type GridEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string | null;
  weeklyHours: number;
};

export type GridShift = {
  employeeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
};

export type GridAbsence = {
  employeeId: string;
  date: Date;
  label: string;
  isVacation: boolean;
};

export type GridRestDay = {
  employeeId: string;
  date: Date;
};

// Tabela partilhada pelas vistas de semana e de mês: colaboradores em
// linha (nome, número e carga horária semanal sempre visíveis, fixos à
// esquerda), datas em coluna — a mesma lógica em ambas, só muda quantos
// dias aparecem. Dias com férias/ausência aprovada mostram essa informação
// em vez de um traço vazio — nesses dias o gerador de escalas já não cria
// turno (ver generateSchedulesForEmployees).
export function ScheduleGrid({
  employees,
  days,
  shifts,
  absences = [],
  restDays = [],
}: {
  employees: GridEmployee[];
  days: Date[];
  shifts: GridShift[];
  absences?: GridAbsence[];
  restDays?: GridRestDay[];
}) {
  const shiftMap = new Map<string, GridShift>();
  for (const s of shifts) shiftMap.set(`${s.employeeId}_${isoDate(s.date)}`, s);

  const absenceMap = new Map<string, GridAbsence>();
  for (const a of absences) absenceMap.set(`${a.employeeId}_${isoDate(a.date)}`, a);

  const restDaySet = new Set<string>();
  for (const r of restDays) restDaySet.add(`${r.employeeId}_${isoDate(r.date)}`);

  if (employees.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <EmptyState message="Sem colaboradores visíveis para os filtros selecionados." />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_3px_rgba(28,25,23,0.06)] dark:border-stone-800 dark:bg-stone-900">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[220px] border-b border-r border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
                Colaborador
              </th>
              {days.map((d, i) => (
                <th
                  key={i}
                  className="min-w-[76px] border-b border-stone-200 bg-stone-50 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
                >
                  {d.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", "")}
                  <div className="mt-0.5 text-[13px] font-semibold normal-case text-stone-700 dark:text-stone-300">
                    {d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((e, rowIdx) => (
              <tr key={e.id} className={rowIdx % 2 === 1 ? "bg-stone-50/50 dark:bg-stone-950/40" : ""}>
                <td className="sticky left-0 z-10 border-b border-r border-stone-200 bg-inherit px-4 py-2.5 dark:border-stone-800">
                  <p className="font-medium text-stone-900 dark:text-stone-100">
                    {e.firstName} {e.lastName}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {e.employeeNumber ? `Nº ${e.employeeNumber}` : "Sem número"} · {e.weeklyHours}h/semana
                  </p>
                </td>
                {days.map((d, i) => {
                  const key = `${e.id}_${isoDate(d)}`;
                  const shift = shiftMap.get(key);
                  const absence = absenceMap.get(key);
                  const isRestDay = restDaySet.has(key);
                  return (
                    <td key={i} className="border-b border-stone-100 px-1.5 py-2 text-center dark:border-stone-800">
                      {shift ? (
                        <Badge color={shift.status === "PUBLISHED" ? "green" : "amber"}>
                          {shift.startTime}-{shift.endTime}
                        </Badge>
                      ) : absence ? (
                        <Badge color={absence.isVacation ? "blue" : "slate"}>{absence.label}</Badge>
                      ) : isRestDay ? (
                        <span className="text-xs font-medium italic text-stone-400 dark:text-stone-600">Folga</span>
                      ) : (
                        <span className="text-xs text-stone-300 dark:text-stone-700">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
