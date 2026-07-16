import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { HorariosTabs } from "../tabs";
import { createShiftTemplate } from "../actions";

export default async function ModelosTurnoPage() {
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "horarios");

  const templates = await prisma.shiftTemplate.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
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
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Início</th>
                  <th className="px-4 py-3">Fim</th>
                  <th className="px-4 py-3">Pausa (min)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3">
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.name}
                    </td>
                    <td className="px-4 py-3">{t.startTime}</td>
                    <td className="px-4 py-3">{t.endTime}</td>
                    <td className="px-4 py-3">{t.breakMins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {canEdit && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              Novo Modelo de Turno
            </h2>
            <form action={createShiftTemplate} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Nome</label>
                <input name="name" required placeholder="Manhã 08h-16h" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Início</label>
                  <input name="startTime" type="time" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Fim</label>
                  <input name="endTime" type="time" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Pausa (min)</label>
                  <input name="breakMins" type="number" defaultValue={0} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Cor</label>
                  <input name="color" type="color" defaultValue="#2563eb" className="h-9 w-full rounded-md border border-slate-300" />
                </div>
              </div>
              <button type="submit" className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Criar modelo
              </button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
