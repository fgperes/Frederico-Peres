type Status = "normal" | "atraso" | "saida-antecipada";

type Punch = {
  name: string;
  initials: string;
  color: string;
  entrada: string;
  saida: string;
  horas: string;
  status: Status;
};

const STATUS_BADGE: Record<Status, string> = {
  normal: "bg-emerald-50 text-emerald-700",
  atraso: "bg-rose-50 text-rose-700",
  "saida-antecipada": "bg-amber-50 text-amber-700",
};

const STATUS_LABEL: Record<Status, string> = {
  normal: "Normal",
  atraso: "Atraso",
  "saida-antecipada": "Saída antecipada",
};

const PUNCHES: Punch[] = [
  { name: "Beatriz Nunes", initials: "BN", color: "bg-rose-400", entrada: "08:02", saida: "16:01", horas: "7h59", status: "normal" },
  { name: "Tiago Mendes", initials: "TM", color: "bg-sky-500", entrada: "08:24", saida: "16:30", horas: "8h06", status: "atraso" },
  { name: "Catarina Alves", initials: "CA", color: "bg-emerald-500", entrada: "09:00", saida: "17:00", horas: "8h00", status: "normal" },
  { name: "Rui Fonseca", initials: "RF", color: "bg-amber-500", entrada: "08:00", saida: "15:12", horas: "7h12", status: "saida-antecipada" },
  { name: "Marta Dias", initials: "MD", color: "bg-violet-400", entrada: "08:05", saida: "16:03", horas: "7h58", status: "normal" },
];

export function PicagensDemo() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
        <span className="text-xs font-semibold text-stone-600">Hoje, 4 de março</span>
        <span className="text-xs font-medium text-stone-400">{PUNCHES.length} registos</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[380px] text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-stone-400">
              <th className="px-4 py-2 font-medium">Colaborador</th>
              <th className="px-2 py-2 font-medium">Entrada</th>
              <th className="px-2 py-2 font-medium">Saída</th>
              <th className="px-2 py-2 font-medium">Horas</th>
              <th className="px-4 py-2 text-right font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {PUNCHES.map((p) => (
              <tr key={p.name} className="border-t border-stone-100">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${p.color}`}
                    >
                      {p.initials}
                    </span>
                    <span className="truncate font-medium text-stone-700">{p.name}</span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-stone-600">{p.entrada}</td>
                <td className="px-2 py-2.5 text-stone-600">{p.saida}</td>
                <td className="px-2 py-2.5 text-stone-600">{p.horas}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[p.status]}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
