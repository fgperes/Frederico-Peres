import { Card } from "@/components/ui";
import { BalanceEditor } from "./equipa/balance-editor";
import type { VacationHistoryRow } from "@/lib/vacation";

// Histórico de saldos de férias ano a ano — direito do ano, transição do ano
// anterior, total, dias marcados/aprovados e saldo, com edição inline do
// direito/transição de cada ano para quem tem perfil de gestão.
export function VacationHistoryTable({
  employeeId,
  rows,
  canManage,
}: {
  employeeId: string;
  rows: VacationHistoryRow[];
  canManage: boolean;
}) {
  if (rows.length === 0) return null;

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
        Histórico de saldos
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
            <tr>
              <th className="py-2 pr-3">Ano</th>
              <th className="py-2 pr-3">Direito do ano</th>
              <th className="py-2 pr-3">Transição</th>
              <th className="py-2 pr-3">Total</th>
              <th className="py-2 pr-3">Marcados (aprovados)</th>
              <th className="py-2 pr-3">Saldo</th>
              {canManage && <th className="py-2 pr-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {rows.map((row) => (
              <tr key={row.year}>
                <td className="py-2 pr-3 font-medium text-stone-900 dark:text-stone-100">{row.year}</td>
                <td className="py-2 pr-3">{row.entitled}</td>
                <td className="py-2 pr-3">{row.carryOver}</td>
                <td className="py-2 pr-3">{row.total}</td>
                <td className="py-2 pr-3">
                  {row.marked} ({row.approved})
                </td>
                <td
                  className={`py-2 pr-3 font-medium ${
                    row.saldo < 0 ? "text-rose-600 dark:text-rose-400" : "text-stone-900 dark:text-stone-100"
                  }`}
                >
                  {row.saldo}
                </td>
                {canManage && (
                  <td className="py-2 pr-3">
                    <BalanceEditor
                      employeeId={employeeId}
                      year={row.year}
                      entitledDays={row.entitled}
                      carryOverDays={row.carryOver}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
