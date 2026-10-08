import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { ListPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { removePayrollComponent } from "../actions";
import { PAYROLL_COMPONENT_CATEGORY_LABELS, taxFlagsToCategory } from "@/lib/payroll";
import { ImportPayrollComponentsForm } from "./import-payroll-components-form";
import { AddPayrollComponentDirectForm } from "./add-payroll-component-direct-form";
import { RubricasEmployeeFilter } from "./employee-filter";

export default async function PayrollRubricasPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string }>;
}) {
  const user = await requireUser();
  if (!canWrite(user.roles, "payroll")) redirect("/payroll");

  const { employeeId: employeeIdFilter } = await searchParams;

  const [components, employees] = await Promise.all([
    prisma.payrollComponent.findMany({
      where: employeeIdFilter ? { employeeId: employeeIdFilter } : undefined,
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.employee.findMany({
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);
  const now = new Date();

  return (
    <div>
      <PageHeader
        icon={ListPlus}
        title="Rubricas de Payroll"
        description="Carregue rubricas (benefícios, rendimentos, descontos) para vários colaboradores de uma vez, ou linha a linha na ficha de cada um."
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">Importar por Excel</h2>
          <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
            Para várias rubricas de uma vez, para vários colaboradores.
          </p>
          <ImportPayrollComponentsForm />
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">Adicionar uma rubrica</h2>
          <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
            Para uma rubrica de um só colaborador, sem precisar de Excel.
          </p>
          <AddPayrollComponentDirectForm
            employees={employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }))}
            currentYear={now.getFullYear()}
            currentMonth={now.getMonth() + 1}
          />
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Últimas rubricas carregadas</h2>
          <RubricasEmployeeFilter
            defaultValue={employeeIdFilter ?? ""}
            options={[
              { value: "", label: "Todos os colaboradores" },
              ...employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })),
            ]}
          />
        </div>
        {components.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Sem rubricas carregadas para este filtro." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 dark:border-stone-800">
                <tr>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3">Rubrica</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {components.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">{c.employee.firstName} {c.employee.lastName}</td>
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3">
                      <Badge color={c.type === "EARNING" ? "green" : "red"}>
                        {PAYROLL_COMPONENT_CATEGORY_LABELS[taxFlagsToCategory(c.taxable, c.ssApplicable)]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{c.type === "EARNING" ? "+" : "−"}{c.amount.toFixed(2)} €</td>
                    <td className="px-4 py-3">{c.recurring ? "Recorrente" : `${c.applyMonth}/${c.applyYear}`}</td>
                    <td className="px-4 py-3 text-right">
                      <form action={removePayrollComponent.bind(null, c.id, c.employeeId)}>
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
        )}
      </Card>
    </div>
  );
}
