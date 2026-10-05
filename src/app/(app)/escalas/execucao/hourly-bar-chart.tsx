// Gráfico de barras (Previsto vs Real) por hora — duas séries categóricas
// fixas (violeta = Previsto, azul = Real), mesmo par de cores já usado em
// estrutura/team-distribution-bar.tsx para duas categorias. Barras finas,
// topo arredondado, ancoradas à base; legenda sempre visível (2 séries);
// vista em tabela incluída (details/summary) para acessibilidade.
export function HourlyBarChart({
  hours,
  scheduled,
  actual,
}: {
  hours: number[];
  scheduled: number[];
  actual: number[];
}) {
  const max = Math.max(1, ...hours.map((h) => Math.max(scheduled[h] ?? 0, actual[h] ?? 0)));
  const chartHeight = 160;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-stone-600 dark:text-stone-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" /> Previsto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Real
        </span>
      </div>

      {hours.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400">Sem turnos nem picagens neste dia.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex items-end gap-2 border-b border-stone-200 pb-1 dark:border-stone-800" style={{ minWidth: hours.length * 44 }}>
            {hours.map((h) => {
              const sched = scheduled[h] ?? 0;
              const act = actual[h] ?? 0;
              return (
                <div key={h} className="flex w-10 shrink-0 flex-col items-center gap-1">
                  <div className="flex items-end gap-0.5" style={{ height: chartHeight }}>
                    <div
                      title={`${h}h — Previsto: ${sched}`}
                      className="w-4 rounded-t bg-violet-500"
                      style={{ height: `${Math.max(1, (sched / max) * chartHeight)}px` }}
                    />
                    <div
                      title={`${h}h — Real: ${act}`}
                      className="w-4 rounded-t bg-sky-400"
                      style={{ height: `${Math.max(1, (act / max) * chartHeight)}px` }}
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400">{h}h</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hours.length > 0 && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer font-medium text-stone-600 dark:text-stone-400">Ver tabela</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left">
              <thead>
                <tr className="text-stone-500 dark:text-stone-400">
                  <th className="py-1 pr-3">Hora</th>
                  <th className="py-1 pr-3">Previsto</th>
                  <th className="py-1">Real</th>
                </tr>
              </thead>
              <tbody>
                {hours.map((h) => (
                  <tr key={h} className="border-t border-stone-100 dark:border-stone-800">
                    <td className="py-1 pr-3">{h}h</td>
                    <td className="py-1 pr-3">{scheduled[h] ?? 0}</td>
                    <td className="py-1">{actual[h] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
