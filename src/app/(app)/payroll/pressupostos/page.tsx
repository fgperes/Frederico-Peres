import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { getPayrollSettings, getIrsBrackets } from "@/lib/payroll";
import { PageHeader, Card, Badge } from "@/components/ui";
import { Sliders } from "lucide-react";
import { redirect } from "next/navigation";
import { updatePayrollSettings, upsertIrsBracket, deleteIrsBracket } from "../actions";

export default async function PayrollSettingsPage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "payroll")) redirect("/payroll");

  const [settings, brackets] = await Promise.all([getPayrollSettings(), getIrsBrackets()]);

  return (
    <div>
      <PageHeader
        icon={Sliders}
        title="Pressupostos de Payroll"
        description="Taxas, subsídios e escalões usados no cálculo dos recibos — reveja e ajuste de acordo com a legislação em vigor."
      />

      <Card className="mb-6 border-amber-200 bg-amber-50">
        <p className="text-sm text-amber-800">
          <strong>Nota:</strong> os escalões de IRS por omissão são uma
          aproximação de referência, não uma cópia das tabelas oficiais da
          Autoridade Tributária (que variam por estado civil, dependentes e
          região, e são atualizadas todos os anos). Ajuste-os aqui para
          refletir as tabelas em vigor ou o acordo aplicável à empresa.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-stone-900">Pressupostos Gerais</h2>
          <form action={updatePayrollSettings} className="space-y-3">
            <Field label="Salário mínimo nacional (€/mês)" name="minimumWage" defaultValue={settings.minimumWage} />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Taxa SS trabalhador"
                name="socialSecurityEmployeeRate"
                defaultValue={settings.socialSecurityEmployeeRate}
                step="0.001"
                hint="ex.: 0.11 = 11%"
              />
              <Field
                label="Taxa SS entidade patronal"
                name="socialSecurityEmployerRate"
                defaultValue={settings.socialSecurityEmployerRate}
                step="0.001"
                hint="ex.: 0.2375 = 23,75%"
              />
            </div>
            <Field
              label="Taxa seguro de acidentes de trabalho"
              name="workAccidentInsuranceRate"
              defaultValue={settings.workAccidentInsuranceRate}
              step="0.001"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Subsídio de alimentação (€/dia)" name="mealAllowanceDaily" defaultValue={settings.mealAllowanceDaily} />
              <Field
                label="Limite isento (€/dia)"
                name="mealAllowanceExemptCap"
                defaultValue={settings.mealAllowanceExemptCap}
                hint="acima disto é tributado"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field
                label="Acréscimo 1ª hora extra"
                name="overtimeRateFirstHour"
                defaultValue={settings.overtimeRateFirstHour}
                step="0.01"
              />
              <Field
                label="Acréscimo horas extra seguintes"
                name="overtimeRateAdditional"
                defaultValue={settings.overtimeRateAdditional}
                step="0.01"
              />
              <Field
                label="Acréscimo fim de semana/feriado"
                name="overtimeRateWeekendHoliday"
                defaultValue={settings.overtimeRateWeekendHoliday}
                step="0.01"
              />
            </div>
            <Field label="Dias úteis por mês (p/ desconto de faltas)" name="workingDaysPerMonth" defaultValue={settings.workingDaysPerMonth} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Subsídio de férias</label>
                <select
                  name="vacationSubsidyMode"
                  defaultValue={settings.vacationSubsidyMode}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="LUMP_SUM_JUNE">Pagamento único em junho</option>
                  <option value="MONTHLY_DUODECIMOS">Duodécimos mensais</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Subsídio de Natal</label>
                <select
                  name="christmasSubsidyMode"
                  defaultValue={settings.christmasSubsidyMode}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="LUMP_SUM_DECEMBER">Pagamento único em dezembro</option>
                  <option value="MONTHLY_DUODECIMOS">Duodécimos mensais</option>
                </select>
              </div>
            </div>

            <button type="submit" className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700">
              Guardar pressupostos
            </button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-stone-900">Escalões de IRS (estimativa)</h2>
          <p className="mb-4 text-xs text-stone-500">
            Taxa marginal aplicada ao valor bruto tributável do mês, em escalões progressivos.
          </p>
          <table className="mb-4 w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase text-stone-500">
              <tr>
                <th className="py-2">Ordem</th>
                <th className="py-2">Até (€)</th>
                <th className="py-2">Taxa</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {brackets.map((b) => (
                <tr key={b.id}>
                  <td className="py-2">{b.order}</td>
                  <td className="py-2">{b.upToGross ?? "—"}</td>
                  <td className="py-2">
                    <Badge color="blue">{(b.rate * 100).toFixed(1)}%</Badge>
                  </td>
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

          <form action={upsertIrsBracket} className="grid grid-cols-4 gap-2">
            <input
              name="order"
              type="number"
              placeholder="Ordem"
              required
              defaultValue={brackets.length + 1}
              className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
            />
            <input
              name="upToGross"
              type="number"
              step="0.01"
              placeholder="Até € (vazio = último)"
              className="col-span-2 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
            />
            <input
              name="rate"
              type="number"
              step="0.001"
              placeholder="Taxa (0.13)"
              required
              className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="col-span-4 rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900"
            >
              Adicionar / atualizar escalão
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  step = "0.01",
  hint,
}: {
  label: string;
  name: string;
  defaultValue: number;
  step?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600">{label}</label>
      <input
        name={name}
        type="number"
        step={step}
        defaultValue={defaultValue}
        required
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
      />
      {hint && <p className="mt-0.5 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}
