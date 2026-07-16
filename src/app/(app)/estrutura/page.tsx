import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { createDepartment, createTeam, createLocation } from "./actions";
import { Building2 } from "lucide-react";

export default async function EstruturaPage() {
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "recursos");

  const [departments, teams, locations] = await Promise.all([
    prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.team.findMany({
      include: { department: true, _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Estrutura Organizacional"
        description="Departamentos, equipas e locais de trabalho."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-900">
            Departamentos
          </h2>
          {departments.length === 0 ? (
            <EmptyState message="Sem departamentos." />
          ) : (
            <ul className="mb-4 divide-y divide-stone-100 text-sm">
              {departments.map((d) => (
                <li key={d.id} className="flex justify-between py-2">
                  <span>{d.name}</span>
                  <span className="text-stone-400">{d._count.employees}</span>
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <form action={createDepartment} className="flex gap-2">
              <input
                name="name"
                placeholder="Novo departamento"
                required
                className="flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900"
              >
                Adicionar
              </button>
            </form>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-900">
            Equipas
          </h2>
          {teams.length === 0 ? (
            <EmptyState message="Sem equipas." />
          ) : (
            <ul className="mb-4 divide-y divide-stone-100 text-sm">
              {teams.map((t) => (
                <li key={t.id} className="flex justify-between py-2">
                  <span>
                    {t.name}
                    <span className="text-stone-400"> · {t.department.name}</span>
                  </span>
                  <span className="text-stone-400">{t._count.employees}</span>
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <form action={createTeam} className="space-y-2">
              <input
                name="name"
                placeholder="Nova equipa"
                required
                className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
              />
              <select
                name="departmentId"
                required
                className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
              >
                <option value="">Departamento...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900"
              >
                Adicionar
              </button>
            </form>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-900">
            Locais de Trabalho
          </h2>
          {locations.length === 0 ? (
            <EmptyState message="Sem locais." />
          ) : (
            <ul className="mb-4 divide-y divide-stone-100 text-sm">
              {locations.map((l) => (
                <li key={l.id} className="flex justify-between py-2">
                  <span>{l.name}</span>
                  <span className="text-stone-400">{l._count.employees}</span>
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <form action={createLocation} className="space-y-2">
              <input
                name="name"
                placeholder="Novo local"
                required
                className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
              />
              <input
                name="address"
                placeholder="Morada (opcional)"
                className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900"
              >
                Adicionar
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
