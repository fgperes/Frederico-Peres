import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { HorariosTabs } from "../tabs";
import { ShiftTemplateRow } from "./shift-template-row";
import { CreateTemplateForm } from "./create-template-form";
import { Layers } from "lucide-react";

export default async function ModelosTurnoPage() {
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "horarios");

  const templates = await prisma.shiftTemplate.findMany({
    include: { _count: { select: { shifts: true, scheduleCyclePatterns: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        icon={Layers}
        title="Módulo de Horários"
        description="Modelos de turno reutilizáveis (ex.: Manhã 08h-16h)."
      />
      <HorariosTabs />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-0">
          {templates.length === 0 ? (
            <div className="p-6">
              <EmptyState message="Sem modelos de turno." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Início</th>
                    <th className="px-4 py-3">Fim</th>
                    <th className="px-4 py-3">Pausa (min)</th>
                    {canEdit && <th className="px-4 py-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {templates.map((t) => (
                    <ShiftTemplateRow
                      key={t.id}
                      template={t}
                      canEdit={canEdit}
                      canDelete={t._count.shifts === 0 && t._count.scheduleCyclePatterns === 0}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {canEdit && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-900">
              Novo Modelo de Turno
            </h2>
            <CreateTemplateForm />
          </Card>
        )}
      </div>
    </div>
  );
}
