import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import {
  getPayrollSettings,
  getIrsTables,
  getFiscalYearConstants,
  FISCAL_REGION_LABELS,
  IRS_TABLE_TYPE_LABELS,
  type IrsTableType,
} from "@/lib/payroll";
import { PageHeader, Card, Badge, LinkButton } from "@/components/ui";
import { Sliders } from "lucide-react";
import { redirect } from "next/navigation";
import { deleteIrsBracket, deleteIrsTable } from "../actions";
import { IrsTableImportForm } from "../irs-table-import-form";
import { PayrollSettingsForm } from "./payroll-settings-form";
import { CreateIrsTableForm } from "./create-irs-table-form";
import { UpsertIrsBracketForm } from "./upsert-irs-bracket-form";
import { FiscalYearConstantsForm } from "./fiscal-year-constants-form";

export default async function PayrollSettingsPage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "payroll")) redirect("/payroll");

  const currentYear = new Date().getFullYear();
  const [settings, irsTables, fiscalConstants] = await Promise.all([
    getPayrollSettings(),
    getIrsTables(),
    getFiscalYearConstants(currentYear),
  ]);

  return (
    <div>
      <PageHeader
        icon={Sliders}
        title="Pressupostos de Payroll"
        description="Taxas, subsídios, escalões de IRS e layout do recibo — reveja e ajuste de acordo com a legislação em vigor."
        action={<LinkButton href="/payroll/layout" variant="secondary">Layout do Recibo</LinkButton>}
      />

      <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10">
        <p className="text-sm text-amber-800">
          <strong>Nota:</strong> os escalões de IRS por omissão são uma
          aproximação de referência, não uma cópia das tabelas oficiais da
          Autoridade Tributária (que variam por estado civil, dependentes e
          região, e são atualizadas todos os anos). Anexe abaixo as tabelas
          em vigor para cada ano/região, ou ajuste-as manualmente.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-100">Pressupostos Gerais</h2>
          <PayrollSettingsForm settings={settings} />
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">Limites de Isenção Fiscal</h2>
          <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
            IAS e limites de isenção do ano — iguais para todos os colaboradores. O recibo de cada mês usa
            automaticamente os valores do ano a que esse recibo pertence.
          </p>
          <FiscalYearConstantsForm constants={fiscalConstants} />
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">Anexar Tabela de IRS</h2>
          <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
            Carregue um ficheiro Excel com os escalões de um ano e região — o recibo de cada colaborador usa
            automaticamente a tabela do ano do recibo e da região fiscal do colaborador (Continente, Açores ou
            Madeira).
          </p>
          <IrsTableImportForm />

          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-medium text-stone-600 dark:text-stone-400">
              Ou criar uma tabela vazia para preencher manualmente
            </summary>
            <CreateIrsTableForm />
          </details>
        </Card>
      </div>

      <div className="mt-6 space-y-6">
        {irsTables.length === 0 ? (
          <Card>
            <p className="text-sm text-stone-500 dark:text-stone-400">Sem tabelas de IRS configuradas — anexe uma acima.</p>
          </Card>
        ) : (
          irsTables.map((table) => (
            <Card key={table.id}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {table.year} — {FISCAL_REGION_LABELS[table.region] ?? table.region} — Tabela {table.tableType}
                    {(table.monthFrom !== 1 || table.monthTo !== 12) && (
                      <Badge color="amber">meses {table.monthFrom}–{table.monthTo}</Badge>
                    )}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {table.label || IRS_TABLE_TYPE_LABELS[table.tableType as IrsTableType]}
                  </p>
                </div>
                <form action={deleteIrsTable.bind(null, table.id)}>
                  <button type="submit" className="text-xs text-rose-600 hover:underline">
                    eliminar tabela
                  </button>
                </form>
              </div>

              <div className="mb-4 overflow-x-auto">
                <table className="w-full min-w-[440px] text-left text-sm">
                  <thead className="border-b border-stone-200 text-xs uppercase text-stone-500 dark:text-stone-400 dark:border-stone-800">
                    <tr>
                      <th className="py-2">Ordem</th>
                      <th className="py-2">Até (€)</th>
                      <th className="py-2">Taxa</th>
                      <th className="py-2">Parcela a abater</th>
                      <th className="py-2">Adicional/dep.</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {table.brackets.map((b) => (
                      <tr key={b.id}>
                        <td className="py-2">{b.order}</td>
                        <td className="py-2">{b.upToGross ?? "—"}</td>
                        <td className="py-2">
                          <Badge color="blue">{(b.rate * 100).toFixed(1)}%</Badge>
                        </td>
                        <td className="py-2">
                          {b.deductionCoefficient != null
                            ? `${b.rate * 100}% × ${b.deductionCoefficient} × (${b.deductionThreshold} - R)`
                            : (b.deduction?.toFixed(2) ?? "0.00")}
                        </td>
                        <td className="py-2">{b.dependentAddition.toFixed(2)}</td>
                        <td className="py-2 text-right">
                          <form action={deleteIrsBracket.bind(null, b.id)}>
                            <button type="submit" className="text-xs text-rose-600 hover:underline">
                              remover
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <UpsertIrsBracketForm irsTableId={table.id} nextOrder={table.brackets.length + 1} />
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
