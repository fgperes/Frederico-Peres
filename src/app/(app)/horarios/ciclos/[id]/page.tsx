import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge } from "@/components/ui";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { RefreshCw } from "lucide-react";
import { PatternCell } from "../pattern-cell";
import { GenerateButton } from "../generate-button";
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
    include: {
      pattern: true,
      assignments: { include: { } },
    },
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

  function patternFor(weekIndex: number, dayOfWeek: number) {
    return cycle!.pattern.find(
      (p) => p.weekIndex === weekIndex && p.dayOfWeek === dayOfWeek
    );
  }

  return (
    <div>
      <PageHeader
        icon={RefreshCw}
        title={cycle.name}
        description={`Ciclo de ${cycle.weeks} semanas, início em ${cycle.startDate.toLocaleDateString("pt-PT")}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-x-auto">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">
            Padrão do Ciclo
          </h2>
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="text-xs uppercase text-stone-500">
              <tr>
                <th className="px-2 py-2">Semana</th>
                {WEEKDAY_LABELS.map((d) => (
                  <th key={d} className="px-2 py-2 text-center">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {Array.from({ length: cycle.weeks }, (_, weekIndex) => (
                <tr key={weekIndex}>
                  <td className="px-2 py-2 font-medium text-stone-700">
                    Semana {weekIndex + 1}
                  </td>
                  {Array.from({ length: 7 }, (_, dayOfWeek) => (
                    <td key={dayOfWeek} className="px-2 py-2">
                      {canEdit ? (
                        <PatternCell
                          cycleId={cycle.id}
                          weekIndex={weekIndex}
                          dayOfWeek={dayOfWeek}
                          currentTemplateId={patternFor(weekIndex, dayOfWeek)?.shiftTemplateId}
                          templates={templates}
                        />
                      ) : (
                        <span className="text-xs text-stone-500">
                          {templates.find(
                            (t) => t.id === patternFor(weekIndex, dayOfWeek)?.shiftTemplateId
                          )?.name ?? "Folga"}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          {canEdit && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-stone-900">
                Gerar Escalas
              </h2>
              <GenerateButton cycleId={cycle.id} />
            </Card>
          )}

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
        </div>
      </div>
    </div>
  );
}
