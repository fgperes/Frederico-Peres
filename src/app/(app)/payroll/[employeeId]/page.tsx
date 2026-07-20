import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { Banknote } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  updateEmployeePayrollProfile,
  addPayrollComponent,
  removePayrollComponent,
} from "../actions";

const MARITAL_LABELS: Record<string, string> = {
  NAO_CASADO: "Não casado(a)",
  CASADO_UNICO_TITULAR: "Casado(a) — único titular",
  CASADO_DOIS_TITULARES: "Casado(a) — dois titulares",
};

export default async function EmployeePayrollPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const user = await requireUser();
  const scope = await employeeScopeWhere(user);
  const canEdit = canWrite(user.roles, "payroll");

  const employee = await prisma.employee.findFirst({
    where: { AND: [{ id: employeeId }, scope] },
    include: {
      contracts: { where: { status: "ACTIVE" }, take: 1 },
      payrollComponents: { orderBy: { createdAt: "desc" } },
      payslips: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 },
    },
  });
  if (!employee) notFound();

  const contract = employee.contracts[0];
  const now = new Date();

  return (
    <div>
      <PageHeader
        icon={Banknote}
        title={`Payroll — ${employee.firstName} ${employee.lastName}`}
        description={contract ? `Salário base: ${contract.baseSalary?.toFixed(2) ?? "—"} € · ${contract.weeklyHours}h/semana` : "Sem contrato ativo"}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-900">Histórico de Recibos</h2>
            {employee.payslips.length === 0 ? (
              <EmptyState message="Sem recibos gerados ainda." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-stone-200 text-xs uppercase text-stone-500">
                    <tr>
                      <th className="py-2">Período</th>
                      <th className="py-2">Bruto</th>
                      <th className="py-2">Líquido</th>
                      <th className="py-2">Custo empresa</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {employee.payslips.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2">
                          {new Date(p.year, p.month - 1, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
                          {p.belowMinimumWage && (
                            <Badge color="red">abaixo do SMN</Badge>
                          )}
                        </td>
                        <td className="py-2">{p.grossTotal.toFixed(2)} €</td>
                        <td className="py-2 font-medium">{p.netTotal.toFixed(2)} €</td>
                        <td className="py-2">{p.employerCost.toFixed(2)} €</td>
                        <td className="py-2 text-right">
                          <Link
                            href={`/payroll/${employee.id}/${p.year}/${p.month}`}
                            className="text-xs font-medium text-violet-700 hover:underline"
                          >
                            ver recibo →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 border-t border-stone-100 pt-4">
              <form action={async (formData: FormData) => {
                "use server";
                const year = formData.get("year");
                const month = formData.get("month");
                const { redirect } = await import("next/navigation");
                redirect(`/payroll/${employeeId}/${year}/${month}`);
              }} className="flex items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">Mês</label>
                  <select name="month" defaultValue={now.getMonth() + 1} className="rounded-md border border-stone-300 px-2 py-1.5 text-sm">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1, 1).toLocaleDateString("pt-PT", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">Ano</label>
                  <input name="year" type="number" defaultValue={now.getFullYear()} className="w-24 rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
                </div>
                <button type="submit" className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700">
                  Ver / Gerar recibo
                </button>
              </form>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-900">Componentes Variáveis</h2>
            {employee.payrollComponents.length === 0 ? (
              <EmptyState message="Sem componentes adicionadas." />
            ) : (
              <ul className="mb-4 divide-y divide-stone-100 text-sm">
                {employee.payrollComponents.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <div>
                      <span className="font-medium">{c.name}</span>{" "}
                      <Badge color={c.type === "EARNING" ? "green" : "red"}>
                        {c.type === "EARNING" ? "+" : "−"}
                        {c.amount.toFixed(2)} €
                      </Badge>
                      <span className="ml-2 text-xs text-stone-400">
                        {c.recurring ? "recorrente" : `pontual ${c.applyMonth}/${c.applyYear}`}
                      </span>
                    </div>
                    {canEdit && (
                      <form action={removePayrollComponent.bind(null, c.id, employee.id)}>
                        <button type="submit" className="text-xs text-rose-600 hover:underline">
                          remover
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canEdit && (
              <form action={addPayrollComponent.bind(null, employee.id)} className="grid grid-cols-2 gap-2">
                <input name="name" placeholder="Nome (ex.: Prémio)" required className="col-span-2 rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
                <select name="type" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm">
                  <option value="EARNING">Vencimento (+)</option>
                  <option value="DEDUCTION">Desconto (−)</option>
                </select>
                <input name="amount" type="number" step="0.01" placeholder="Valor €" required className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
                <label className="flex items-center gap-1.5 text-xs text-stone-600">
                  <input type="checkbox" name="recurring" defaultChecked /> Recorrente (todos os meses)
                </label>
                <label className="flex items-center gap-1.5 text-xs text-stone-600">
                  <input type="checkbox" name="taxable" defaultChecked /> Sujeito a IRS
                </label>
                <label className="flex items-center gap-1.5 text-xs text-stone-600">
                  <input type="checkbox" name="ssApplicable" defaultChecked /> Sujeito a SS
                </label>
                <div />
                <select name="applyMonth" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input name="applyYear" type="number" defaultValue={now.getFullYear()} placeholder="Ano (se pontual)" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
                <button type="submit" className="col-span-2 rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900">
                  Adicionar componente
                </button>
              </form>
            )}
          </Card>
        </div>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-900">Dados de Payroll</h2>
          {canEdit ? (
            <form action={updateEmployeePayrollProfile.bind(null, employee.id)} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Estado civil (fiscal)</label>
                <select name="maritalStatus" defaultValue={employee.maritalStatus ?? ""} className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm">
                  <option value="">—</option>
                  {Object.entries(MARITAL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Dependentes</label>
                <input name="dependents" type="number" min={0} defaultValue={employee.dependents} className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Região fiscal</label>
                <select name="fiscalRegion" defaultValue={employee.fiscalRegion} className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm">
                  <option value="CONTINENTE">Continente</option>
                  <option value="ACORES">Açores</option>
                  <option value="MADEIRA">Madeira</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Subsídio de alimentação (€/dia, opcional)</label>
                <input
                  name="mealAllowanceOverride"
                  type="number"
                  step="0.01"
                  defaultValue={employee.mealAllowanceOverride ?? ""}
                  placeholder="Usar valor por omissão"
                  className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                />
              </div>
              <button type="submit" className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700">
                Guardar
              </button>
            </form>
          ) : (
            <dl className="space-y-2 text-sm">
              <Info label="Estado civil" value={employee.maritalStatus ? MARITAL_LABELS[employee.maritalStatus] : "—"} />
              <Info label="Dependentes" value={String(employee.dependents)} />
              <Info label="Região fiscal" value={employee.fiscalRegion} />
            </dl>
          )}
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-stone-500">{label}</dt>
      <dd className="text-stone-900">{value}</dd>
    </div>
  );
}
