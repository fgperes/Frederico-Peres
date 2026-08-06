import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accessFor, canWrite } from "@/lib/roles";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { EstruturaTabs } from "./tabs";
import { createDepartment, createTeam, createLocation } from "./actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Users2, MapPin, ChevronRight } from "lucide-react";

export default async function EstruturaPage() {
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "recursos");
  const recursosAccess = accessFor(user.roles, "recursos");
  if (recursosAccess !== "rw" && recursosAccess !== "ro") redirect("/estrutura/organograma");

  const [departments, teams, locations] = await Promise.all([
    prisma.department.findMany({
      include: { _count: { select: { employees: true, teams: true } } },
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

      <EstruturaTabs />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
            <Building2 size={15} className="text-stone-500 dark:text-stone-400" />
            Departamentos
          </h2>
          {departments.length === 0 ? (
            <EmptyState message="Sem departamentos." />
          ) : (
            <ul className="mb-4 divide-y divide-stone-100 text-sm dark:divide-stone-800">
              {departments.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/estrutura/departamentos/${d.id}`}
                    className="flex items-center justify-between py-2.5 text-stone-700 hover:text-violet-700 dark:text-stone-300 dark:hover:text-violet-400"
                  >
                    <span>{d.name}</span>
                    <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                      {d._count.employees} colab. · {d._count.teams} equipa(s)
                      <ChevronRight size={14} />
                    </span>
                  </Link>
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
                className="flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
              <button
                type="submit"
                className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900 dark:bg-violet-600 dark:hover:bg-violet-700"
              >
                Adicionar
              </button>
            </form>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
            <Users2 size={15} className="text-stone-500 dark:text-stone-400" />
            Equipas
          </h2>
          {teams.length === 0 ? (
            <EmptyState message="Sem equipas." />
          ) : (
            <ul className="mb-4 divide-y divide-stone-100 text-sm dark:divide-stone-800">
              {teams.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/estrutura/equipas/${t.id}`}
                    className="flex items-center justify-between py-2.5 text-stone-700 hover:text-violet-700 dark:text-stone-300 dark:hover:text-violet-400"
                  >
                    <span>
                      {t.name}
                      <span className="text-stone-500 dark:text-stone-500"> · {t.department.name}</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                      {t._count.employees} colab.
                      <ChevronRight size={14} />
                    </span>
                  </Link>
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
                className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
              <select
                name="departmentId"
                required
                className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
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
                className="w-full rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900 dark:bg-violet-600 dark:hover:bg-violet-700"
              >
                Adicionar
              </button>
            </form>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
            <MapPin size={15} className="text-stone-500 dark:text-stone-400" />
            Locais de Trabalho
          </h2>
          {locations.length === 0 ? (
            <EmptyState message="Sem locais." />
          ) : (
            <ul className="mb-4 divide-y divide-stone-100 text-sm dark:divide-stone-800">
              {locations.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/estrutura/locais/${l.id}`}
                    className="flex items-center justify-between py-2.5 text-stone-700 hover:text-violet-700 dark:text-stone-300 dark:hover:text-violet-400"
                  >
                    <span>{l.name}</span>
                    <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                      {l._count.employees} colab.
                      <ChevronRight size={14} />
                    </span>
                  </Link>
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
                className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
              <input
                name="address"
                placeholder="Morada (opcional)"
                className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900 dark:bg-violet-600 dark:hover:bg-violet-700"
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
