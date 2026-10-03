import { isoDate } from "@/lib/dates";
import { shiftDurationHours } from "@/lib/schedule";
import { Badge, EmptyState } from "@/components/ui";
import { AvatarImage } from "@/lib/avatars";

export type GridEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string | null;
  weeklyHours: number;
  user?: { avatarKey: string | null; avatarImage: string | null } | null;
};

export type GridShift = {
  employeeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  shiftTemplate?: { name: string; color: string; breakMins: number } | null;
};

export type GridAbsence = {
  employeeId: string;
  date: Date;
  label: string;
  isVacation: boolean;
};

// Converte a cor hex do modelo de turno (ex.: "#2563eb") num par
// fundo/texto suave para o chip da grelha — não usamos a cor sólida
// diretamente para manter contraste de leitura em ambos os temas.
function chipTint(hex: string | null | undefined): { bg: string; text: string; border: string } {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return { bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" }; // violeta por omissão
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.12)`,
    text: hex,
    border: `rgba(${r}, ${g}, ${b}, 0.35)`,
  };
}

function formatPlannedHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Tabela partilhada pelas vistas de semana e de mês: colaboradores em
// linha (avatar, nome, número e total de horas planeadas no período
// visível, fixos à esquerda), datas em coluna — a mesma lógica em ambas,
// só muda quantos dias aparecem. Dias com férias/ausência aprovada mostram
// essa informação; qualquer outro dia sem turno é folga — nunca fica em
// branco.
export function ScheduleGrid({
  employees,
  days,
  shifts,
  absences = [],
}: {
  employees: GridEmployee[];
  days: Date[];
  shifts: GridShift[];
  absences?: GridAbsence[];
}) {
  const shiftMap = new Map<string, GridShift>();
  for (const s of shifts) shiftMap.set(`${s.employeeId}_${isoDate(s.date)}`, s);

  const absenceMap = new Map<string, GridAbsence>();
  for (const a of absences) absenceMap.set(`${a.employeeId}_${isoDate(a.date)}`, a);

  const plannedHoursByEmployee = new Map<string, number>();
  for (const s of shifts) {
    const hours = shiftDurationHours(s.startTime, s.endTime, s.shiftTemplate?.breakMins ?? 0);
    plannedHoursByEmployee.set(s.employeeId, (plannedHoursByEmployee.get(s.employeeId) ?? 0) + hours);
  }

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
              <th className="sticky left-0 z-20 min-w-[240px] border-b border-r border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
                Colaborador
              </th>
              {days.map((d, i) => (
                <th
                  key={i}
                  className="min-w-[84px] border-b border-stone-200 bg-stone-50 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
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
            {employees.map((e, rowIdx) => {
              const planned = plannedHoursByEmployee.get(e.id) ?? 0;
              return (
                <tr key={e.id} className={rowIdx % 2 === 1 ? "bg-stone-50/50 dark:bg-stone-950/40" : ""}>
                  <td className="sticky left-0 z-10 border-b border-r border-stone-200 bg-inherit px-4 py-2.5 dark:border-stone-800">
                    <div className="flex items-center gap-2.5">
                      <AvatarImage
                        avatarKey={e.user?.avatarKey}
                        avatarImage={e.user?.avatarImage}
                        name={`${e.firstName} ${e.lastName}`}
                        size={30}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-stone-900 dark:text-stone-100">
                          {e.firstName} {e.lastName}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {formatPlannedHours(planned)} planeado(s)
                          <span className="text-stone-400 dark:text-stone-600"> · {e.weeklyHours}h/sem. contrato</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  {days.map((d, i) => {
                    const key = `${e.id}_${isoDate(d)}`;
                    const shift = shiftMap.get(key);
                    const absence = absenceMap.get(key);
                    return (
                      <td key={i} className="border-b border-stone-100 px-1.5 py-2 text-center align-middle dark:border-stone-800">
                        {shift ? (
                          <ShiftChip shift={shift} />
                        ) : absence ? (
                          <Badge color={absence.isVacation ? "blue" : "slate"}>{absence.label}</Badge>
                        ) : (
                          <span className="text-xs font-medium italic text-stone-400 dark:text-stone-600">Folga</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShiftChip({ shift }: { shift: GridShift }) {
  const tint = chipTint(shift.shiftTemplate?.color);
  const published = shift.status === "PUBLISHED";
  return (
    <div
      className="relative mx-auto flex max-w-[110px] flex-col rounded-lg px-2 py-1.5 text-left"
      style={{ backgroundColor: tint.bg, border: `1px solid ${tint.border}` }}
      title={published ? "Publicado" : "Rascunho"}
    >
      <span
        className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${
          published ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      <span className="text-[12px] leading-tight font-semibold" style={{ color: tint.text }}>
        {shift.startTime}-{shift.endTime}
      </span>
      {shift.shiftTemplate?.name && (
        <span className="truncate text-[10px] leading-tight text-stone-500 dark:text-stone-400">
          {shift.shiftTemplate.name}
        </span>
      )}
    </div>
  );
}
