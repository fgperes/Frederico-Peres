import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { employeeScopeWhere } from "@/lib/scope";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Users } from "lucide-react";

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

  const [employees, departments] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: { department: true, team: true },
      orderBy: [{ status: "asc" }, { lastName: "asc" }],
      take: 200,
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Colaboradores"
        description="Ficha central de colaboradores e estrutura organizacional."
        action={
          canEdit ? (
            <div className="flex gap-2">
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

      <Card className="mb-6">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Pesquisar
            </label>
            <input
              type="text"
              name="q"
              defaultValue={params.q}
              placeholder="Nome, email, função..."
              className="w-56 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Departamento
            </label>
            <select
              name="departmentId"
              defaultValue={params.departmentId ?? ""}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
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
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Estado
            </label>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
            >
              <option value="">Todos</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900"
          >
            Filtrar
          </button>
        </form>
      </Card>

      <Card className="p-0">
        {employees.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Nenhum colaborador encontrado." />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Departamento</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/colaboradores/${e.id}`}
                      className="font-medium text-violet-700 hover:underline"
                    >
                      {e.firstName} {e.lastName}
                    </Link>
                    <div className="text-xs text-stone-500">{e.email}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{e.jobTitle}</td>
                  <td className="px-4 py-3 text-stone-700">
                    {e.department?.name ?? "—"}
                    {e.team ? ` / ${e.team.name}` : ""}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
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
