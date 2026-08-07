import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { HorariosTabs } from "../tabs";
import { CreateCycleForm } from "./create-cycle-form";
import { UseTemplateForm } from "./use-template-form";
import { DeleteCycleButton } from "./delete-cycle-button";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default async function CiclosPage() {
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "horarios");

  const [cycles, templates] = await Promise.all([
    prisma.scheduleCycle.findMany({
      where: { isTemplate: false },
      include: { _count: { select: { assignments: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.scheduleCycle.findMany({
      where: { isTemplate: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        icon={RefreshCw}
        title="Módulo de Horários"
        description="Padrões de escala que se repetem ciclicamente (ex.: rotativos de 2, 3 ou 4 semanas)."
      />
      <HorariosTabs />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-0">
            {cycles.length === 0 ? (
              <div className="p-6">
                <EmptyState message="Sem ciclos definidos." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Duração</th>
                      <th className="px-4 py-3">Início</th>
                      <th className="px-4 py-3">Colaboradores</th>
                      {canEdit && <th className="px-4 py-3 text-right">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {cycles.map((c) => (
                      <tr key={c.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3">
                          <Link href={`/horarios/ciclos/${c.id}`} className="font-medium text-violet-700 hover:underline">
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{c.weeks} semanas</td>
                        <td className="px-4 py-3">{c.startDate.toLocaleDateString("pt-PT")}</td>
                        <td className="px-4 py-3">{c._count.assignments}</td>
                        {canEdit && (
                          <td className="px-4 py-3 text-right">
                            <DeleteCycleButton cycleId={c.id} cycleName={c.name} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-stone-900">Modelos Pré-Definidos</h2>
              <Badge color="blue">{templates.length}</Badge>
            </div>
            {templates.length === 0 ? (
              <EmptyState message="Sem modelos guardados. Abra um ciclo e use 'Guardar como modelo' para o reutilizar no futuro." />
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {templates.map((t) => (
                  <li key={t.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link href={`/horarios/ciclos/${t.id}`} className="font-medium text-violet-700 hover:underline">
                          {t.name}
                        </Link>
                        <span className="ml-2 text-xs text-stone-500">{t.weeks} semanas</span>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <UseTemplateForm templateId={t.id} templateName={t.name} />
                          <DeleteCycleButton cycleId={t.id} cycleName={t.name} />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {canEdit && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-900">Novo Ciclo</h2>
            <CreateCycleForm />
          </Card>
        )}
      </div>
    </div>
  );
}
