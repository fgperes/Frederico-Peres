import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { employeeScopeWhere } from "@/lib/scope";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, StatCard, Badge, LinkButton, EmptyState } from "@/components/ui";
import { AvatarImage } from "@/lib/avatars";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Users, UserCheck, UserPlus, ShieldOff } from "lucide-react";

export default async function ColaboradoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; departmentId?: string; status?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const scope = await employeeScopeWhere(user);
  const canEdit = canWrite(user.roles, "recursos");

  const where: Prisma.EmployeeWhereInput = {
    AND: [
      scope,
      params.departmentId ? { departmentId: params.departmentId } : {},
      params.status ? { status: params.status } : {},
      params.q
        ? {
            OR: [
              { firstName: { contains: params.q } },
              { lastName: { contains: params.q } },
              { email: { contains: params.q } },
              { jobTitle: { contains: params.q } },
            ],
          }
        : {},
    ],
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [employees, departments, totalCount, activeCount, noAccessCount, newThisMonthCount] =
    await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          department: true,
          team: true,
          location: true,
          user: { select: { avatarKey: true, avatarImage: true } },
        },
        orderBy: [{ status: "asc" }, { lastName: "asc" }],
        take: 200,
      }),
      prisma.department.findMany({ orderBy: { name: "asc" } }),
      prisma.employee.count({ where: scope }),
      prisma.employee.count({ where: { AND: [scope, { status: "ACTIVE" }] } }),
      prisma.employee.count({ where: { AND: [scope, { userId: null }] } }),
      prisma.employee.count({ where: { AND: [scope, { hireDate: { gte: monthStart } }] } }),
    ]);

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Colaboradores"
        description="Ficha central de colaboradores e estrutura organizacional."
        action={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/colaboradores/importar" variant="secondary">
                Importar Excel
              </LinkButton>
              <LinkButton href="/colaboradores/novo">
                + Novo Colaborador
              </LinkButton>
            </div>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de colaboradores" value={totalCount} icon={Users} accent="violet" />
        <StatCard label="Ativos" value={activeCount} icon={UserCheck} accent="emerald" />
        <StatCard
          label="Sem conta de acesso"
          value={noAccessCount}
          icon={ShieldOff}
          accent="amber"
          hint="Ainda não convidados para a aplicação"
        />
        <StatCard label="Admitidos este mês" value={newThisMonthCount} icon={UserPlus} accent="sky" />
      </div>

      <Card className="mb-6">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Pesquisar
            </label>
            <input
              type="text"
              name="q"
              defaultValue={params.q}
              placeholder="Nome, email, função..."
              className="w-56 rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Departamento
            </label>
            <select
              name="departmentId"
              defaultValue={params.departmentId ?? ""}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            >
              <option value="">Todos</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Estado
            </label>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            >
              <option value="">Todos</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900 dark:bg-violet-600 dark:hover:bg-violet-700"
          >
            Filtrar
          </button>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        {employees.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Nenhum colaborador encontrado." />
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
              <tr>
                <th className="px-4 py-3">Nº</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Departamento</th>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-stone-50 dark:hover:bg-stone-900">
                  <td className="px-4 py-3 text-stone-500 dark:text-stone-400">
                    {e.employeeNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AvatarImage
                        avatarKey={e.user?.avatarKey}
                        avatarImage={e.user?.avatarImage}
                        name={`${e.firstName} ${e.lastName}`}
                        size={32}
                      />
                      <div>
                        <Link
                          href={`/colaboradores/${e.id}`}
                          className="font-medium text-violet-700 hover:underline dark:text-violet-400"
                        >
                          {e.firstName} {e.lastName}
                        </Link>
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                          {e.email}
                          {!e.userId && (
                            <span
                              title="Sem conta de acesso"
                              className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-700 dark:text-stone-300">{e.jobTitle}</td>
                  <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
                    {e.department?.name ?? "—"}
                    {e.team ? ` / ${e.team.name}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {e.location ? <Badge color="blue">{e.location.name}</Badge> : "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
                    {e.employmentType === "FULL_TIME" ? "Full-time" : "Part-time"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={e.status === "ACTIVE" ? "green" : "slate"}>
                      {e.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
