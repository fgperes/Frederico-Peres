import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { updateDepartment, deleteDepartment } from "../../actions";
import { DeleteSectionButton } from "../../delete-section-button";
import { MigrateEmployeeForm } from "../../migrate-employee-form";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, Users2 } from "lucide-react";

export default async function DepartamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "recursos");

  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      teams: { orderBy: { name: "asc" }, include: { _count: { select: { employees: true } } } },
      employees: { orderBy: { firstName: "asc" }, include: { location: true } },
    },
  });
  if (!department) notFound();

  const [allDepartments] = await Promise.all([
    prisma.department.findMany({ where: { id: { not: id } }, orderBy: { name: "asc" } }),
  ]);

  const boundUpdate = updateDepartment.bind(null, department.id);
  const boundDelete = deleteDepartment.bind(null, department.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={Building2}
        title={department.name}
        description="Detalhe do departamento"
        action={
          <Link
            href="/estrutura"
            className="text-sm font-medium text-violet-700 hover:underline dark:text-violet-400"
          >
            ← Voltar à estrutura
          </Link>
        }
      />

      {canEdit && (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Editar</h2>
          <form action={boundUpdate} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                Nome
              </label>
              <input
                name="name"
                defaultValue={department.name}
                required
                className="w-56 rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                Departamento-mãe
              </label>
              <select
                name="parentId"
                defaultValue={department.parentId ?? ""}
                className="w-56 rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="">Nenhum (topo)</option>
                {allDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Guardar
            </button>
          </form>
          <div className="mt-4 border-t border-stone-200 pt-4 dark:border-stone-800">
            <DeleteSectionButton
              onDelete={boundDelete}
              confirmMessage={`Apagar o departamento "${department.name}"? Só é possível se estiver vazio.`}
            />
          </div>
        </Card>
      )}

      {department.teams.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
            <Users2 size={15} className="text-stone-500 dark:text-stone-400" />
            Equipas neste departamento
          </h2>
          <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-800">
            {department.teams.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/estrutura/equipas/${t.id}`}
                  className="flex items-center justify-between py-2 text-stone-700 hover:text-violet-700 dark:text-stone-300 dark:hover:text-violet-400"
                >
                  <span>{t.name}</span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {t._count.employees} colaborador(es)
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-0">
        <div className="border-b border-stone-200 px-6 py-4 dark:border-stone-800">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Colaboradores no departamento
          </h2>
        </div>
        {department.employees.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Sem colaboradores neste departamento." />
          </div>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {department.employees.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
                <div>
                  <Link
                    href={`/colaboradores/${e.id}`}
                    className="font-medium text-violet-700 hover:underline dark:text-violet-400"
                  >
                    {e.firstName} {e.lastName}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                    <span>{e.jobTitle}</span>
                    {e.location && <Badge color="blue">{e.location.name}</Badge>}
                  </div>
                </div>
                {canEdit && (
                  <MigrateEmployeeForm
                    employeeId={e.id}
                    field="departmentId"
                    options={allDepartments.map((d) => ({ value: d.id, label: d.name }))}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
