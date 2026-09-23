import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getOrCreateVacationBalancesBatch, computeHeadcount, getVacationType, effectiveStatus, toDateKey } from "@/lib/vacation";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { FeriasTabs } from "../tabs";
import { BalanceEditor } from "./balance-editor";
import { RecalculateButton } from "./recalculate-button";
import { VacationLegend } from "../calendar";
import { EmployeeTreeFilter } from "@/components/employee-tree-filter";
import { redirect } from "next/navigation";
import { Plane, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const STATUS_BG: Record<string, string> = {
  PENDING: "bg-amber-400",
  APPROVED: "bg-emerald-500",
  CANCEL_PENDING: "bg-orange-500",
};

function parseIdList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

const DIMENSIONS = { month: 1, quarter: 3, semester: 6, year: 12 } as const;
type Dimension = keyof typeof DIMENSIONS;
const DIMENSION_LABELS: Record<Dimension, string> = {
  month: "Mês",
  quarter: "Trimestre",
  semester: "Semestre",
  year: "Ano",
};

// Alinha o mês inicial ao começo do período (ex.: trimestre começa sempre
// em Jan/Abr/Jul/Out) para a navegação Anterior/Seguinte fazer sentido.
function alignMonth(month: number, monthsCount: number): number {
  return Math.floor(month / monthsCount) * monthsCount;
}

export default async function FeriasEquipaPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; employees?: string; dimension?: string }>;
}) {
  const user = await requireUser();
  if (!canWrite(user.roles, "ferias")) redirect("/ferias");

  const params = await searchParams;
  const now = new Date();
  const dimension: Dimension = params.dimension && params.dimension in DIMENSIONS
    ? (params.dimension as Dimension)
    : "month";
  const monthsCount = DIMENSIONS[dimension];
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = alignMonth(
    params.month !== undefined ? parseInt(params.month, 10) : now.getMonth(),
    monthsCount
  );

  const scope = await employeeScopeWhere(user);
  const [departments, teams, allEmployees] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { AND: [scope, { status: "ACTIVE" }] },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, departmentId: true, teamId: true },
    }),
  ]);

  const selectedEmployees = new Set(parseIdList(params.employees));
  const hasFilter = selectedEmployees.size > 0;

  const employees = hasFilter
    ? allEmployees.filter((e) => selectedEmployees.has(e.id))
    : allEmployees;

  // Um ou mais meses consecutivos, consoante a dimensão escolhida — cada um
  // mantém o seu próprio bloco de colunas por dia (1..daysInMonth), só que
  // concatenados horizontalmente em vez de um único mês.
  const monthsInRange = Array.from({ length: monthsCount }, (_, i) => {
    const start = new Date(year, month + i, 1);
    const end = new Date(year, month + i + 1, 0);
    return {
      year: start.getFullYear(),
      month: start.getMonth(),
      daysInMonth: end.getDate(),
      label: start.toLocaleDateString("pt-PT", { month: "long", year: "numeric" }),
    };
  });
  const rangeStart = new Date(year, month, 1);
  const rangeEnd = new Date(year, month + monthsCount, 0, 23, 59, 59);

  const type = await getVacationType().catch(() => null);
  const absences = type
    ? await prisma.absence.findMany({
        where: {
          employeeId: { in: employees.map((e) => e.id) },
          absenceTypeId: type.id,
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { gte: rangeStart, lte: rangeEnd },
        },
      })
    : [];

  // employeeId -> "AAAA-MM-DD" -> status
  const grid = new Map<string, Map<string, string>>();
  // "AAAA-MM-DD" -> employeeIds com férias nesse dia (para deteção de sobreposição)
  const byDateKey = new Map<string, string[]>();
  for (const a of absences) {
    const dateKey = toDateKey(a.startDate);
    if (!grid.has(a.employeeId)) grid.set(a.employeeId, new Map());
    grid.get(a.employeeId)!.set(dateKey, effectiveStatus(a));
    if (!byDateKey.has(dateKey)) byDateKey.set(dateKey, []);
    byDateKey.get(dateKey)!.push(a.employeeId);
  }
  const overlapDateKeys = new Set(
    Array.from(byDateKey.entries()).filter(([, ids]) => new Set(ids).size >= 2).map(([key]) => key)
  );

  const rangeLabel =
    monthsCount === 1
      ? monthsInRange[0].label
      : `${monthsInRange[0].label} — ${monthsInRange[monthsInRange.length - 1].label}`;

  const baseParams: Record<string, string> = { dimension };
  if (params.employees) baseParams.employees = params.employees;

  const prevParams = new URLSearchParams(baseParams);
  const nextParams = new URLSearchParams(baseParams);
  const prevAnchor = new Date(year, month - monthsCount, 1);
  const nextAnchor = new Date(year, month + monthsCount, 1);
  prevParams.set("year", String(prevAnchor.getFullYear()));
  prevParams.set("month", String(prevAnchor.getMonth()));
  nextParams.set("year", String(nextAnchor.getFullYear()));
  nextParams.set("month", String(nextAnchor.getMonth()));

  const dimensionParams: Record<Dimension, URLSearchParams> = {} as Record<Dimension, URLSearchParams>;
  for (const dim of Object.keys(DIMENSIONS) as Dimension[]) {
    const dimMonths = DIMENSIONS[dim];
    const alignedMonth = alignMonth(month, dimMonths);
    const p = new URLSearchParams();
    if (params.employees) p.set("employees", params.employees);
    p.set("dimension", dim);
    p.set("year", String(year));
    p.set("month", String(alignedMonth));
    dimensionParams[dim] = p;
  }

  // Sem limite artificial de colaboradores: getOrCreateVacationBalancesBatch
  // faz sempre um número fixo de consultas, não uma por colaborador.
  const employeeIdsForBalance = employees;

  return (
    <div>
      <PageHeader
        icon={Plane}
        title="Férias"
        description="Planeamento de férias da equipa — filtre por departamento, equipa ou colaborador."
        action={<RecalculateButton />}
      />

      <FeriasTabs showTeamTabs />

      <Card className="mb-6">
        <form method="get" className="flex flex-wrap items-start gap-4">
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="dimension" value={dimension} />
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
          <div className="flex items-center gap-3 pt-6">
            <button
              type="submit"
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Filtrar
            </button>
            {hasFilter && (
              <Link
                href="/ferias/equipa"
                className="text-xs text-stone-500 underline hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
              >
                Limpar filtros
              </Link>
            )}
          </div>
          <p className="w-full text-[11px] text-stone-400 dark:text-stone-600">
            Selecionar um departamento seleciona todas as suas equipas e colaboradores; selecionar uma
            equipa seleciona todos os seus colaboradores. Pesquise por nome para filtrar a árvore. Sem
            seleção mostra todos os colaboradores visíveis.
          </p>
        </form>
      </Card>

      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold capitalize text-stone-900 dark:text-stone-100">
            {rangeLabel}
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex rounded-md border border-stone-300 p-0.5 dark:border-stone-700">
              {(Object.keys(DIMENSIONS) as Dimension[]).map((dim) => (
                <Link
                  key={dim}
                  href={`/ferias/equipa?${dimensionParams[dim].toString()}`}
                  className={`rounded px-2.5 py-1 text-xs font-medium ${
                    dim === dimension
                      ? "bg-violet-600 text-white"
                      : "text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                  }`}
                >
                  {DIMENSION_LABELS[dim]}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/ferias/equipa?${prevParams.toString()}`}
                className="rounded-md border border-stone-300 p-1.5 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
              >
                <ChevronLeft size={16} />
              </Link>
              <Link
                href={`/ferias/equipa?${nextParams.toString()}`}
                className="rounded-md border border-stone-300 p-1.5 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
              >
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        <VacationLegend />

        {employees.length === 0 ? (
          <EmptyState icon={Plane} message="Sem colaboradores para os filtros selecionados." />
        ) : (
          <>
            {overlapDateKeys.size > 0 && (
              <p className="mb-3 flex items-start gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Sobreposição de férias detetada em {overlapDateKeys.size} dia(s) do período (assinalados a
                vermelho abaixo).
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white px-2 py-1.5 text-stone-500 dark:bg-stone-900 dark:text-stone-400" />
                    {monthsInRange.map((m) => (
                      <th
                        key={`${m.year}-${m.month}`}
                        colSpan={m.daysInMonth}
                        className="border-l border-stone-200 px-1 py-1 text-center font-medium capitalize text-stone-500 dark:border-stone-800 dark:text-stone-400"
                      >
                        {m.label}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="sticky left-0 bg-white px-2 py-1.5 text-stone-500 dark:bg-stone-900 dark:text-stone-400">
                      Colaborador
                    </th>
                    {monthsInRange.map((m) =>
                      Array.from({ length: m.daysInMonth }, (_, i) => i + 1).map((day) => {
                        const dateKey = toDateKey(new Date(m.year, m.month, day));
                        return (
                          <th
                            key={dateKey}
                            className={`w-6 px-0.5 py-1.5 text-center font-normal text-stone-400 dark:text-stone-600 ${
                              overlapDateKeys.has(dateKey) ? "text-rose-600 dark:text-rose-400" : ""
                            }`}
                          >
                            {day}
                          </th>
                        );
                      })
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {employees.map((e) => {
                    const row = grid.get(e.id);
                    return (
                      <tr key={e.id}>
                        <td className="sticky left-0 whitespace-nowrap bg-white px-2 py-1 font-medium text-stone-800 dark:bg-stone-900 dark:text-stone-200">
                          {e.firstName} {e.lastName}
                        </td>
                        {monthsInRange.map((m) =>
                          Array.from({ length: m.daysInMonth }, (_, i) => i + 1).map((day) => {
                            const dateKey = toDateKey(new Date(m.year, m.month, day));
                            const status = row?.get(dateKey);
                            const overlap = overlapDateKeys.has(dateKey) && !!status;
                            return (
                              <td key={dateKey} className="p-0.5 text-center">
                                <div
                                  title={
                                    status
                                      ? `${e.firstName} ${e.lastName} — ${
                                          status === "APPROVED"
                                            ? "aprovado"
                                            : status === "CANCEL_PENDING"
                                              ? "pedido de cancelamento"
                                              : "pendente"
                                        }`
                                      : undefined
                                  }
                                  className={`mx-auto h-5 w-5 rounded ${
                                    status ? `${STATUS_BG[status]} text-white` : ""
                                  } ${overlap ? "ring-2 ring-inset ring-rose-600" : ""} flex items-center justify-center text-[9px] font-medium`}
                                >
                                  {status ? "F" : ""}
                                </div>
                              </td>
                            );
                          })
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {employeeIdsForBalance.length > 0 && (
        <TeamHeadcountTable employeeIds={employeeIdsForBalance.map((e) => e.id)} year={year} />
      )}
    </div>
  );
}

async function TeamHeadcountTable({ employeeIds, year }: { employeeIds: string[]; year: number }) {
  const [employees, balances] = await Promise.all([
    prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    getOrCreateVacationBalancesBatch(employeeIds, year),
  ]);

  const rows = employees.map((e) => {
    const balance = balances.get(e.id);
    return {
      employee: e,
      headcount: computeHeadcount(balance ?? { entitledDays: 0, carryOverDays: 0, usedDays: 0, plannedDays: 0 }),
    };
  });

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
        Saldo de férias por colaborador ({year})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
            <tr>
              <th className="px-3 py-2">Colaborador</th>
              <th className="px-3 py-2">Dias do ano</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Marcados (aprovados)</th>
              <th className="px-3 py-2">Saldo</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {rows.map(({ employee, headcount }) => (
              <tr key={employee.id}>
                <td className="px-3 py-2 font-medium text-stone-800 dark:text-stone-200">
                  {employee.firstName} {employee.lastName}
                </td>
                <td className="px-3 py-2 text-stone-600 dark:text-stone-300">{headcount.entitled}</td>
                <td className="px-3 py-2 text-stone-600 dark:text-stone-300">{headcount.total}</td>
                <td className="px-3 py-2 text-stone-600 dark:text-stone-300">
                  {headcount.marked} ({headcount.approved})
                </td>
                <td
                  className={`px-3 py-2 font-medium ${
                    headcount.saldo < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-stone-800 dark:text-stone-200"
                  }`}
                >
                  {headcount.saldo}
                </td>
                <td className="px-3 py-2">
                  <BalanceEditor employeeId={employee.id} year={year} totalDays={headcount.total} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
