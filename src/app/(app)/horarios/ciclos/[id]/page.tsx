import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge } from "@/components/ui";
import { RefreshCw } from "lucide-react";
import { WeeksGrid } from "../weeks-grid";
import { GenerateButton } from "../generate-button";
import { SaveTemplateForm } from "../save-template-form";
import { assignEmployeeToCycle, removeAssignment } from "../actions";
import { notFound } from "next/navigation";

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "horarios");
  const scope = await employeeScopeWhere(user);

  const cycle = await prisma.scheduleCycle.findUnique({
    where: { id },
    include: { pattern: true, assignments: true },
  });
  if (!cycle) notFound();

  const [templates, employees] = await Promise.all([
    prisma.shiftTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: scope, orderBy: { firstName: "asc" } }),
  ]);

  const assignedEmployees = await prisma.employee.findMany({
    where: { id: { in: cycle.assignments.map((a) => a.employeeId) } },
  });
  const employeeMap = new Map(assignedEmployees.map((e) => [e.id, e]));

  return (
    <div>
      <PageHeader
        icon={RefreshCw}
        title={cycle.name}
        description={
          cycle.isTemplate
            ? `Modelo pré-definido de ${cycle.weeks} semana(s) — sem colaboradores associados.`
            : `Ciclo de ${cycle.weeks} semana(s), início em ${cycle.startDate.toLocaleDateString("pt-PT")}`
        }
        action={
          <div className="flex items-center gap-2">
            {cycle.isTemplate && <Badge color="blue">Modelo</Badge>}
            {canEdit && !cycle.isTemplate && <SaveTemplateForm cycleId={cycle.id} />}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-x-auto">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900">
              Padrão do Ciclo
            </h2>
            {canEdit && (
              <p className="text-xs text-stone-500">
                Arraste pelo ícone para reordenar semanas
              </p>
            )}
          </div>
          <WeeksGrid
            cycleId={cycle.id}
            weeksCount={cycle.weeks}
            pattern={cycle.pattern}
            templates={templates}
            canEdit={canEdit}
          />
        </Card>

        <div className="space-y-6">
          {canEdit && !cycle.isTemplate && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-stone-900">
                Gerar Escalas
              </h2>
              <GenerateButton cycleId={cycle.id} />
            </Card>
          )}

          {!cycle.isTemplate && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-stone-900">
                Colaboradores Associados
              </h2>
              <ul className="mb-4 space-y-2 text-sm">
                {cycle.assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between">
                    <span>
                      {employeeMap.get(a.employeeId)?.firstName}{" "}
                      {employeeMap.get(a.employeeId)?.lastName}
                      {a.offsetWeeks > 0 && (
                        <Badge color="slate">semana +{a.offsetWeeks}</Badge>
                      )}
                    </span>
                    {canEdit && (
                      <form action={removeAssignment.bind(null, a.id, cycle.id)}>
                        <button type="submit" className="text-xs text-rose-600 hover:underline">
                          remover
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
              {canEdit && (
                <form action={assignEmployeeToCycle} className="space-y-2">
                  <input type="hidden" name="cycleId" value={cycle.id} />
                  <select name="employeeId" required className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm">
                    <option value="">Colaborador...</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.firstName} {e.lastName}
                      </option>
                    ))}
                  </select>
                  <input
                    name="offsetWeeks"
                    type="number"
                    min={0}
                    max={cycle.weeks - 1}
                    defaultValue={0}
                    placeholder="Desfasamento (semanas)"
                    className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                  />
                  <button type="submit" className="w-full rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900">
                    Associar
                  </button>
                </form>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
