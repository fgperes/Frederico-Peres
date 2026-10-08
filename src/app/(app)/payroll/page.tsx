import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accessFor, canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, StatCard, LinkButton, EmptyState } from "@/components/ui";
import { Banknote, Sliders, LayoutTemplate, ListPlus, Users, FileCheck2, Clock3, FileSpreadsheet } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PayrollEmployeeTable } from "./payroll-employee-table";
import { EmployeeTreeFilter } from "@/components/employee-tree-filter";

function parseIdList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; employees?: string }>;
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
  const [departments, teams, allEmployees, payslips] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { ...scope, status: "ACTIVE" },
      include: {
        user: { select: { avatarKey: true, avatarImage: true } },
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.payslip.findMany({ where: { year, month } }),
  ]);
  const selectedEmployees = new Set(parseIdList(params.employees));
  const hasEmployeeFilter = selectedEmployees.size > 0;
  const employees = hasEmployeeFilter ? allEmployees.filter((e) => selectedEmployees.has(e.id)) : allEmployees;

  const payslipByEmployee = new Map(payslips.map((p) => [p.employeeId, p]));
  const generatedCount = employees.filter((e) => payslipByEmployee.has(e.id)).length;
  const pendingCount = employees.length - generatedCount;
  const netTotal = employees.reduce((sum, e) => sum + (payslipByEmployee.get(e.id)?.netTotal ?? 0), 0);

  return (
    <div>
      <PageHeader
        icon={Banknote}
        title="Payroll"
        description="Processamento salarial mensal — com base no horário, picagens e dados contratuais."
        action={
          canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <LinkButton href="/payroll/rubricas" variant="secondary">
                <ListPlus size={14} /> Rubricas
              </LinkButton>
              <LinkButton href="/payroll/layout" variant="secondary">
                <LayoutTemplate size={14} /> Layout do Recibo
              </LinkButton>
              <LinkButton href="/payroll/pressupostos" variant="secondary">
                <Sliders size={14} /> Pressupostos
              </LinkButton>
            </div>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Colaboradores no âmbito" value={employees.length} icon={Users} accent="violet" />
        <StatCard label="Recibos gerados" value={generatedCount} icon={FileCheck2} accent="emerald" />
        <StatCard label="Por gerar" value={pendingCount} icon={Clock3} accent="amber" />
        <StatCard
          label="Total líquido do mês"
          value={`${netTotal.toFixed(2)} €`}
          icon={Banknote}
          accent="sky"
        />
      </div>

      <Card className="mb-6">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Mês</label>
            <select name="month" defaultValue={month} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleDateString("pt-PT", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Ano</label>
            <input
              name="year"
              type="number"
              defaultValue={year}
              className="w-24 rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Departamento / Equipa / Colaborador
            </label>
            <EmployeeTreeFilter
              departments={departments.map((d) => ({ id: d.id, name: d.name }))}
              teams={teams.map((t) => ({ id: t.id, name: t.name, departmentId: t.departmentId }))}
              employees={allEmployees.map((e) => ({
                id: e.id,
                name: `${e.firstName} ${e.lastName}`,
                departmentId: e.departmentId,
                teamId: e.teamId,
              }))}
              initialSelected={Array.from(selectedEmployees)}
            />
          </div>
          <button type="submit" className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900">
            Aplicar
          </button>
          {hasEmployeeFilter && (
            <Link
              href={`/payroll?year=${year}&month=${month}`}
              className="text-xs text-stone-500 underline hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Limpar filtro
            </Link>
          )}
          {canEdit && (
            <a
              href={`/api/payroll/export?year=${year}&month=${month}`}
              className="ml-auto flex items-center gap-1.5 rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:border-stone-700"
            >
              <FileSpreadsheet size={14} /> Exportar período (Excel)
            </a>
          )}
        </form>
      </Card>

      <Card className="p-0">
        {employees.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Sem colaboradores no seu âmbito." />
          </div>
        ) : (
          <PayrollEmployeeTable
            year={year}
            month={month}
            canEdit={canEdit}
            employees={employees.map((e) => {
              const payslip = payslipByEmployee.get(e.id);
              return {
                id: e.id,
                firstName: e.firstName,
                lastName: e.lastName,
                baseSalary: e.baseSalary ?? null,
                hasPayslip: !!payslip,
                netTotal: payslip?.netTotal ?? null,
                avatarKey: e.user?.avatarKey,
                avatarImage: e.user?.avatarImage,
              };
            })}
          />
        )}
      </Card>
    </div>
  );
}
