import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accessFor, canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { Banknote, Sliders } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const user = await requireUser();

  if (accessFor(user.roles, "payroll") === "own") {
    if (user.employeeId) redirect(`/payroll/${user.employeeId}`);
    return <EmptyState message="Não existe uma ficha de colaborador associada à sua conta." />;
  }

  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year ?? now.getFullYear());
  const month = Number(params.month ?? now.getMonth() + 1);
  const canEdit = canWrite(user.roles, "payroll");

  const scope = await employeeScopeWhere(user);
  const [employees, payslips] = await Promise.all([
    prisma.employee.findMany({
      where: { ...scope, status: "ACTIVE" },
      include: { contracts: { where: { status: "ACTIVE" }, take: 1 } },
      orderBy: { firstName: "asc" },
    }),
    prisma.payslip.findMany({ where: { year, month } }),
  ]);

  const payslipByEmployee = new Map(payslips.map((p) => [p.employeeId, p]));

  return (
    <div>
      <PageHeader
        icon={Banknote}
        title="Payroll"
        description="Processamento salarial mensal — com base no horário, picagens e dados contratuais."
        action={
          canEdit ? (
            <LinkButton href="/payroll/pressupostos" variant="secondary">
              <Sliders size={14} /> Pressupostos
            </LinkButton>
          ) : undefined
        }
      />

      <Card className="mb-6">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Mês</label>
            <select name="month" defaultValue={month} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleDateString("pt-PT", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Ano</label>
            <input
              name="year"
              type="number"
              defaultValue={year}
              className="w-24 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900">
            Aplicar
          </button>
        </form>
      </Card>

      <Card className="p-0">
        {employees.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Sem colaboradores no seu âmbito." />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3">Salário base</th>
                <th className="px-4 py-3">Estado do recibo</th>
                <th className="px-4 py-3">Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {employees.map((e) => {
                const payslip = payslipByEmployee.get(e.id);
                const baseSalary = e.contracts[0]?.baseSalary;
                return (
                  <tr key={e.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <Link href={`/payroll/${e.id}`} className="font-medium text-violet-700 hover:underline">
                        {e.firstName} {e.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{baseSalary ? `${baseSalary.toFixed(2)} €` : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge color={payslip ? "green" : "amber"}>{payslip ? "Gerado" : "Por gerar"}</Badge>
                    </td>
                    <td className="px-4 py-3">{payslip ? `${payslip.netTotal.toFixed(2)} €` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
