type Payslip = {
  name: string;
  initials: string;
  color: string;
  base: string;
  descontos: string;
  liquido: string;
};

const PAYSLIPS: Payslip[] = [
  { name: "Beatriz Nunes", initials: "BN", color: "bg-rose-400", base: "1 450,00 €", descontos: "398,75 €", liquido: "1 051,25 €" },
  { name: "Tiago Mendes", initials: "TM", color: "bg-sky-500", base: "1 200,00 €", descontos: "312,40 €", liquido: "887,60 €" },
  { name: "Catarina Alves", initials: "CA", color: "bg-emerald-500", base: "1 600,00 €", descontos: "456,20 €", liquido: "1 143,80 €" },
  { name: "Rui Fonseca", initials: "RF", color: "bg-amber-500", base: "1 350,00 €", descontos: "361,55 €", liquido: "988,45 €" },
];

export function PayrollDemo() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
        <span className="text-xs font-semibold text-stone-600">Processamento — março 2026</span>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Processado</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-stone-400">
              <th className="px-4 py-2 font-medium">Colaborador</th>
              <th className="px-2 py-2 text-right font-medium">Vencimento base</th>
              <th className="px-2 py-2 text-right font-medium">Descontos</th>
              <th className="px-4 py-2 text-right font-medium">Líquido</th>
            </tr>
          </thead>
          <tbody>
            {PAYSLIPS.map((p) => (
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
                <td className="px-2 py-2.5 text-right text-stone-600">{p.base}</td>
                <td className="px-2 py-2.5 text-right text-stone-600">{p.descontos}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-stone-800">{p.liquido}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
