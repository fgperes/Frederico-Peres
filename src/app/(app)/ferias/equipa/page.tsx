import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getOrCreateVacationBalance, computeHeadcount, getVacationType } from "@/lib/vacation";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { FeriasTabs } from "../tabs";
import { BalanceEditor } from "./balance-editor";
import { redirect } from "next/navigation";
import { Plane, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const STATUS_BG: Record<string, string> = {
  PENDING: "bg-amber-400",
  APPROVED: "bg-emerald-500",
};

function parseIdList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export default async function FeriasEquipaPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; departments?: string; teams?: string; employees?: string }>;
}) {
  const user = await requireUser();
  if (!canWrite(user.roles, "ferias")) redirect("/ferias");

  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = params.month !== undefined ? parseInt(params.month, 10) : now.getMonth();

  const scope = await employeeScopeWhere(user);
  const [departments, teams, allEmployees] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, include: { department: true } }),
    prisma.employee.findMany({
      where: { AND: [scope, { status: "ACTIVE" }] },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, departmentId: true, teamId: true },
    }),
  ]);

  const selectedDepts = new Set(parseIdList(params.departments));
  const selectedTeams = new Set(parseIdList(params.teams));
  const selectedEmployees = new Set(parseIdList(params.employees));
  const hasFilter = selectedDepts.size > 0 || selectedTeams.size > 0 || selectedEmployees.size > 0;

  const employees = hasFilter
    ? allEmployees.filter(
        (e) =>
          (e.departmentId && selectedDepts.has(e.departmentId)) ||
          (e.teamId && selectedTeams.has(e.teamId)) ||
          selectedEmployees.has(e.id)
      )
    : allEmployees;

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const daysInMonth = monthEnd.getDate();

  const type = await getVacationType().catch(() => null);
  const absences = type
    ? await prisma.absence.findMany({
        where: {
          employeeId: { in: employees.map((e) => e.id) },
          absenceTypeId: type.id,
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { gte: monthStart, lte: monthEnd },
        },
      })
    : [];

  // employeeId -> day (1-31) -> status
  const grid = new Map<string, Map<number, string>>();
  // day -> employeeIds com férias nesse dia (para deteção de sobreposição)
  const byDay = new Map<number, string[]>();
  for (const a of absences) {
    const day = a.startDate.getDate();
    if (!grid.has(a.employeeId)) grid.set(a.employeeId, new Map());
    grid.get(a.employeeId)!.set(day, a.status);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(a.employeeId);
  }
  const overlapDays = new Set(
    Array.from(byDay.entries()).filter(([, ids]) => new Set(ids).size >= 2).map(([day]) => day)
  );

  const monthLabel = monthStart.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

  const baseParams: Record<string, string> = {};
  if (params.departments) baseParams.departments = params.departments;
  if (params.teams) baseParams.teams = params.teams;
  if (params.employees) baseParams.employees = params.employees;

  const prevParams = new URLSearchParams(baseParams);
  const nextParams = new URLSearchParams(baseParams);
  if (month === 0) {
    prevParams.set("year", String(year - 1));
    prevParams.set("month", "11");
  } else {
    prevParams.set("month", String(month - 1));
  }
  if (month === 11) {
    nextParams.set("year", String(year + 1));
    nextParams.set("month", "0");
  } else {
    nextParams.set("month", String(month + 1));
  }

  const employeeIdsForBalance = employees.slice(0, 30); // limita a query de saldos a um número razoável

  return (
    <div>
      <PageHeader
        icon={Plane}
        title="Férias"
        description="Planeamento de férias da equipa — filtre por departamento, equipa ou colaboradores."
      />

      <FeriasTabs showTeamTabs />

      <Card className="mb-6">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
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
          <p className="w-full text-[11px] text-stone-400 dark:text-stone-600">
            Sem seleção mostra todos os colaboradores visíveis. Use Ctrl/Cmd+clique para selecionar vários.
          </p>
        </form>
      </Card>

      <Card className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold capitalize text-stone-900 dark:text-stone-100">
            {monthLabel}
          </h3>
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

        {employees.length === 0 ? (
          <EmptyState icon={Plane} message="Sem colaboradores para os filtros selecionados." />
        ) : (
          <>
            {overlapDays.size > 0 && (
              <p className="mb-3 flex items-start gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Sobreposição de férias detetada em {overlapDays.size} dia(s) deste mês (assinalados a
                vermelho abaixo).
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white px-2 py-1.5 text-stone-500 dark:bg-stone-900 dark:text-stone-400">
                      Colaborador
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                      <th
                        key={day}
                        className={`w-6 px-0.5 py-1.5 text-center font-normal text-stone-400 dark:text-stone-600 ${
                          overlapDays.has(day) ? "text-rose-600 dark:text-rose-400" : ""
                        }`}
                      >
                        {day}
                      </th>
                    ))}
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
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                          const status = row?.get(day);
                          const overlap = overlapDays.has(day) && !!status;
                          return (
                            <td key={day} className="p-0.5 text-center">
                              <div
                                title={status ? `${e.firstName} ${e.lastName} — ${status === "APPROVED" ? "aprovado" : "pendente"}` : undefined}
                                className={`mx-auto h-5 w-5 rounded ${
                                  status ? `${STATUS_BG[status]} text-white` : ""
                                } ${overlap ? "ring-2 ring-inset ring-rose-600" : ""} flex items-center justify-center text-[9px] font-medium`}
                              >
                                {status ? "F" : ""}
                              </div>
                            </td>
                          );
                        })}
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
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  const rows = await Promise.all(
    employees.map(async (e) => {
      const { balance } = await getOrCreateVacationBalance(e.id, year);
      return { employee: e, headcount: computeHeadcount(balance) };
    })
  );

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
        Saldo de férias por colaborador ({year})
      </h3>
      <table className="w-full text-left text-sm">
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
                <BalanceEditor
                  employeeId={employee.id}
                  year={year}
                  entitledDays={headcount.entitled}
                  carryOverDays={headcount.carryOver}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
