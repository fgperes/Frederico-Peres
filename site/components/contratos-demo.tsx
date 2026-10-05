type Status = "ativo" | "experimental" | "a-terminar";

type Contract = {
  name: string;
  initials: string;
  color: string;
  type: string;
  inicio: string;
  termo: string;
  status: Status;
};

const STATUS_BADGE: Record<Status, string> = {
  ativo: "bg-emerald-50 text-emerald-700",
  experimental: "bg-sky-50 text-sky-700",
  "a-terminar": "bg-amber-50 text-amber-700",
};

const STATUS_LABEL: Record<Status, string> = {
  ativo: "Ativo",
  experimental: "Período experimental",
  "a-terminar": "A terminar",
};

const CONTRACTS: Contract[] = [
  { name: "Beatriz Nunes", initials: "BN", color: "bg-rose-400", type: "Sem termo", inicio: "03/2021", termo: "—", status: "ativo" },
  { name: "Tiago Mendes", initials: "TM", color: "bg-sky-500", type: "Termo certo", inicio: "01/2026", termo: "01/2027", status: "experimental" },
  { name: "Catarina Alves", initials: "CA", color: "bg-emerald-500", type: "Sem termo", inicio: "06/2019", termo: "—", status: "ativo" },
  { name: "Rui Fonseca", initials: "RF", color: "bg-amber-500", type: "Termo certo", inicio: "04/2025", termo: "04/2026", status: "a-terminar" },
  { name: "Marta Dias", initials: "MD", color: "bg-violet-400", type: "Sem termo", inicio: "09/2022", termo: "—", status: "ativo" },
];

export function ContratosDemo() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
        <span className="text-xs font-semibold text-stone-600">Contratos de trabalho</span>
        <span className="text-xs font-medium text-stone-400">{CONTRACTS.length} contratos</span>
      </div>
      <ul className="divide-y divide-stone-100">
        {CONTRACTS.map((c) => (
          <li key={c.name} className="flex items-center gap-3 px-4 py-2.5">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${c.color}`}>
              {c.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-800">{c.name}</p>
              <p className="truncate text-xs text-stone-500">
                {c.type} · desde {c.inicio}
                {c.termo !== "—" ? ` · termo ${c.termo}` : ""}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[c.status]}`}>
              {STATUS_LABEL[c.status]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
