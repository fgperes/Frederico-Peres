import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { updateLocation, deleteLocation } from "../../actions";
import { DeleteSectionButton } from "../../delete-section-button";
import { MigrateEmployeeForm } from "../../migrate-employee-form";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin } from "lucide-react";

export default async function LocalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "recursos");

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      employees: { orderBy: { firstName: "asc" }, include: { department: true } },
    },
  });
  if (!location) notFound();

  const otherLocations = await prisma.location.findMany({
    where: { id: { not: id } },
    orderBy: { name: "asc" },
  });

  const boundUpdate = updateLocation.bind(null, location.id);
  const boundDelete = deleteLocation.bind(null, location.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={MapPin}
        title={location.name}
        description={location.address ?? "Local de trabalho"}
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
                defaultValue={location.name}
                required
                className="w-56 rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                Morada
              </label>
              <input
                name="address"
                defaultValue={location.address ?? ""}
                className="w-64 rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
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
              confirmMessage={`Apagar o local "${location.name}"? Só é possível se estiver vazio.`}
            />
          </div>
        </Card>
      )}

      <Card className="p-0">
        <div className="border-b border-stone-200 px-6 py-4 dark:border-stone-800">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Colaboradores neste local
          </h2>
        </div>
        {location.employees.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Sem colaboradores neste local." />
          </div>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {location.employees.map((e) => (
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
                    {e.department && <Badge color="slate">{e.department.name}</Badge>}
                  </div>
                </div>
                {canEdit && (
                  <MigrateEmployeeForm
                    employeeId={e.id}
                    field="locationId"
                    options={otherLocations.map((l) => ({ value: l.id, label: l.name }))}
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
