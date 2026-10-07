import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { Banknote } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { removePayrollComponent } from "../actions";
import { AddPayrollComponentForm } from "../add-payroll-component-form";

function subsidyModeLabel(mode: string | null, months: string | null): string {
  if (mode === "DUODECIMOS") return "Duodécimos mensais";
  if (mode === "MONTHS") return `Meses: ${months || "—"}`;
  return "Definição global";
}

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
      employeeContracts: { where: { status: "ACTIVE" }, take: 1, include: { contractProfile: true } },
      payrollComponents: { orderBy: { createdAt: "desc" } },
      payslips: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 },
    },
  });
  if (!employee) notFound();

  const contract = employee.employeeContracts[0];
  const now = new Date();

  return (
    <div>
      <PageHeader
        icon={Banknote}
        title={`Payroll — ${employee.firstName} ${employee.lastName}`}
        description={`Salário base: ${employee.baseSalary?.toFixed(2) ?? "—"} €${
          contract ? ` · ${contract.contractProfile.weeklyHours}h/semana` : " · Sem contrato ativo"
        }`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Histórico de Recibos</h2>
            {employee.payslips.length === 0 ? (
              <EmptyState message="Sem recibos gerados ainda." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-stone-200 text-xs uppercase text-stone-500 dark:text-stone-400 dark:border-stone-800">
                    <tr>
                      <th className="py-2">Período</th>
                      <th className="py-2">Bruto</th>
                      <th className="py-2">Líquido</th>
                      <th className="py-2">Custo empresa</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
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

            {canEdit && (
              <div className="mt-4 border-t border-stone-100 pt-4">
                <form action={async (formData: FormData) => {
                  "use server";
                  const year = formData.get("year");
                  const month = formData.get("month");
                  const { redirect } = await import("next/navigation");
                  redirect(`/payroll/${employeeId}/${year}/${month}`);
                }} className="flex items-end gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Mês</label>
                    <select name="month" defaultValue={now.getMonth() + 1} className="rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(2000, m - 1, 1).toLocaleDateString("pt-PT", { month: "long" })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Ano</label>
                    <input name="year" type="number" defaultValue={now.getFullYear()} className="w-24 rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700" />
                  </div>
                  <button type="submit" className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700">
                    Ver / Gerar recibo
                  </button>
                </form>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Componentes Variáveis</h2>
            {employee.payrollComponents.length === 0 ? (
              <EmptyState message="Sem componentes adicionadas." />
            ) : (
              <ul className="mb-4 divide-y divide-stone-100 text-sm dark:divide-stone-800">
                {employee.payrollComponents.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <div>
                      <span className="font-medium">{c.name}</span>{" "}
                      <Badge color={c.type === "EARNING" ? "green" : "red"}>
                        {c.type === "EARNING" ? "+" : "−"}
                        {c.amount.toFixed(2)} €
                      </Badge>
                      <span className="ml-2 text-xs text-stone-400 dark:text-stone-500">
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
              <AddPayrollComponentForm
                employeeId={employee.id}
                currentYear={now.getFullYear()}
                currentMonth={now.getMonth() + 1}
              />
            )}
          </Card>
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Dados de Payroll</h2>
            <Link
              href={`/colaboradores/${employee.id}/payroll`}
              className="text-xs font-medium text-violet-700 hover:underline"
            >
              editar →
            </Link>
          </div>
          <dl className="space-y-2 text-sm">
            <Info label="Beneficiário ADSE" value={employee.adseBeneficiary ? "Sim" : "Não"} />
            <Info
              label="IRS Jovem"
              value={
                employee.youngTaxRegime
                  ? `Sim — desde ${employee.youngTaxRegimeStartYear}`
                  : "Não"
              }
            />
            <Info
              label="Desconto judicial"
              value={employee.judicialDeductionPercent ? `${employee.judicialDeductionPercent}%` : "—"}
            />
            <Info
              label="Subsídio de férias"
              value={subsidyModeLabel(employee.vacationSubsidyMode, employee.vacationSubsidyMonths)}
            />
            <Info
              label="Subsídio de Natal"
              value={subsidyModeLabel(employee.christmasSubsidyMode, employee.christmasSubsidyMonths)}
            />
          </dl>
          <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
            Estado civil, dependentes e região fiscal estão na ficha do colaborador.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="text-stone-900 dark:text-stone-100">{value}</dd>
    </div>
  );
}
