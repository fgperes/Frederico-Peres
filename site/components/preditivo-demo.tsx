const DATA = [
  { day: "Seg", forecast: 6, scheduled: 6 },
  { day: "Ter", forecast: 5, scheduled: 5 },
  { day: "Qua", forecast: 7, scheduled: 6 },
  { day: "Qui", forecast: 6, scheduled: 6 },
  { day: "Sex", forecast: 9, scheduled: 7 },
  { day: "Sáb", forecast: 10, scheduled: 8 },
  { day: "Dom", forecast: 4, scheduled: 4 },
];

const MAX = 10;

export function PreditivoDemo() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Cobertura prevista vs. escalada</p>
        <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">Rascunho</span>
      </div>

      <div className="mt-6 flex h-36 items-end gap-3">
        {DATA.map((d) => (
          <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div
                className="w-1/2 rounded-t bg-stone-200"
                style={{ height: `${(d.forecast / MAX) * 100}%` }}
                title={`Procura prevista: ${d.forecast}`}
              />
              <div
                className="w-1/2 rounded-t bg-violet-600"
                style={{ height: `${(d.scheduled / MAX) * 100}%` }}
                title={`Equipa escalada: ${d.scheduled}`}
              />
            </div>
            <span className="text-[10px] font-medium text-stone-500">{d.day}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 text-[11px] text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
          Procura prevista
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
          Equipa escalada
        </span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-stone-500">
        Sexta e sábado mostram falta de cobertura face à procura prevista — proposta de reforço em rascunho,
        pronta para revisão.
      </p>
    </div>
  );
}
