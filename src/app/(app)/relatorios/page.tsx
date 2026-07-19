import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRead } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { generateReport, REPORT_DEFINITIONS } from "@/lib/reports";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { redirect } from "next/navigation";
import { BarChart3, Download } from "lucide-react";
import Link from "next/link";

function parseIdList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{
    report?: string;
    from?: string;
    to?: string;
    departments?: string;
    teams?: string;
    employees?: string;
  }>;
}) {
  const user = await requireUser();
  if (!canRead(user.roles, "relatorios")) redirect("/dashboard");

  const params = await searchParams;
  const reportKey = params.report ?? REPORT_DEFINITIONS[0].key;
  const reportDef = REPORT_DEFINITIONS.find((r) => r.key === reportKey) ?? REPORT_DEFINITIONS[0];

  const scope = await employeeScopeWhere(user);
  const isBroadScope = Object.keys(scope).length === 0;

  const [departments, teams, allEmployees] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, include: { department: true } }),
    prisma.employee.findMany({
      where: scope,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, departmentId: true, teamId: true },
    }),
  ]);
  const scopedIds = new Set(allEmployees.map((e) => e.id));

  const selectedDepts = new Set(parseIdList(params.departments));
  const selectedTeams = new Set(parseIdList(params.teams));
  const selectedEmployees = new Set(parseIdList(params.employees));
  const hasFilter = selectedDepts.size > 0 || selectedTeams.size > 0 || selectedEmployees.size > 0;

  let employeeIds: string[] | undefined;
  if (hasFilter) {
    employeeIds = allEmployees
      .filter(
        (e) =>
          (e.departmentId && selectedDepts.has(e.departmentId)) ||
          (e.teamId && selectedTeams.has(e.teamId)) ||
          selectedEmployees.has(e.id)
      )
      .map((e) => e.id);
  } else if (!isBroadScope) {
    employeeIds = Array.from(scopedIds);
  }

  const now = new Date();
  const from = params.from ? new Date(`${params.from}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = params.to ? new Date(`${params.to}T23:59:59`) : now;
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  let result: { columns: string[]; rows: (string | number)[][] } | null = null;
  let error: string | null = null;
  try {
    result = await generateReport(reportKey, { from, to, employeeIds });
  } catch (err) {
    error = err instanceof Error ? err.message : "Erro ao gerar o relatório.";
  }

  const exportParams = new URLSearchParams();
  exportParams.set("report", reportKey);
  exportParams.set("from", fromStr);
  exportParams.set("to", toStr);
  if (employeeIds) exportParams.set("employees", employeeIds.join(","));

  const previewRows = result?.rows.slice(0, 200) ?? [];

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Relatórios"
        description="Extraia relatórios de acessos, colaboradores, picagens, férias, ausências, payroll, escalas e horas."
      />

      <Card className="mb-6">
        <form method="get" className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Relatório
            </label>
            <select
              name="report"
              defaultValue={reportKey}
              className="w-full max-w-md rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            >
              {REPORT_DEFINITIONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {reportDef.usesRange && (
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">De</label>
                <input
                  type="date"
                  name="from"
                  defaultValue={fromStr}
                  className="rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Até</label>
                <input
                  type="date"
                  name="to"
                  defaultValue={toStr}
                  className="rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                Departamento
              </label>
              <select
                name="departments"
                multiple
                defaultValue={Array.from(selectedDepts)}
                className="h-24 w-48 rounded-md border border-stone-300 px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Equipa</label>
              <select
                name="teams"
                multiple
                defaultValue={Array.from(selectedTeams)}
                className="h-24 w-48 rounded-md border border-stone-300 px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.department.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                Colaboradores
              </label>
              <select
                name="employees"
                multiple
                defaultValue={Array.from(selectedEmployees)}
                className="h-24 w-56 rounded-md border border-stone-300 px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                {allEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Gerar relatório
            </button>
            <Link
              href={`/api/reports?${exportParams.toString()}`}
              className="flex items-center gap-1.5 rounded-md border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <Download size={14} />
              Exportar XLSX
            </Link>
          </div>
          <p className="text-[11px] text-stone-400 dark:text-stone-600">
            Sem seleção mostra todos os colaboradores visíveis para o seu perfil. Use Ctrl/Cmd+clique para
            selecionar vários.
          </p>
        </form>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{reportDef.label}</h3>
          {result && (
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {result.rows.length} registo(s){result.rows.length > 200 ? " — a mostrar os primeiros 200" : ""}
            </span>
          )}
        </div>

        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </p>
        ) : !result || result.rows.length === 0 ? (
          <EmptyState icon={BarChart3} message="Sem dados para os filtros selecionados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
                <tr>
                  {result.columns.map((c) => (
                    <th key={c} className="whitespace-nowrap px-3 py-2">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="whitespace-nowrap px-3 py-1.5 text-stone-700 dark:text-stone-300">
                        {cell}
                      </td>
                    ))}
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
