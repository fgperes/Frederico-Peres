type Status = "concluida" | "agendada";

type EvaluationRow = {
  name: string;
  initials: string;
  color: string;
  template: string;
  status: Status;
  date?: string;
  percent?: number;
  consequence?: string;
};

const STATUS_BADGE: Record<Status, string> = {
  concluida: "bg-emerald-50 text-emerald-700",
  agendada: "bg-amber-50 text-amber-700",
};

const STATUS_LABEL: Record<Status, string> = {
  concluida: "Concluída",
  agendada: "Agendada",
};

const EVALUATIONS: EvaluationRow[] = [
  { name: "Beatriz Nunes", initials: "BN", color: "bg-rose-400", template: "Avaliação Semestral", status: "concluida", percent: 82, consequence: "Progressão de carreira" },
  { name: "Tiago Mendes", initials: "TM", color: "bg-sky-500", template: "Avaliação Semestral", status: "agendada", date: "15/04/2026" },
  { name: "Catarina Alves", initials: "CA", color: "bg-emerald-500", template: "Avaliação Anual", status: "concluida", percent: 68, consequence: "Aumento salarial" },
  { name: "Rui Fonseca", initials: "RF", color: "bg-amber-500", template: "Avaliação Semestral", status: "concluida", percent: 45, consequence: "Plano de desenvolvimento" },
  { name: "Marta Dias", initials: "MD", color: "bg-violet-400", template: "Avaliação Anual", status: "agendada", date: "22/04/2026" },
];

export function AvaliacoesDemo() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
        <span className="text-xs font-semibold text-stone-600">Avaliações de desempenho</span>
        <span className="text-xs font-medium text-stone-400">{EVALUATIONS.length} avaliações</span>
      </div>
      <ul className="divide-y divide-stone-100">
        {EVALUATIONS.map((e) => (
          <li key={e.name} className="px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${e.color}`}>
                {e.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-800">{e.name}</p>
                <p className="truncate text-xs text-stone-500">
                  {e.template} · {e.status === "agendada" ? `agendada para ${e.date}` : `resultado ${e.percent}%`}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[e.status]}`}>
                {STATUS_LABEL[e.status]}
              </span>
            </div>
            {e.status === "concluida" && e.consequence && (
              <p className="mt-1.5 pl-11 text-xs text-stone-500">{e.consequence}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
