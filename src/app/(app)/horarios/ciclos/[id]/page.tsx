import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge } from "@/components/ui";
import { RefreshCw } from "lucide-react";
import { WeeksGrid } from "../weeks-grid";
import { GenerateButton } from "../generate-button";
import { SaveTemplateForm } from "../save-template-form";
import { DeleteCycleButton } from "../delete-cycle-button";
import { CycleAssignmentPanel } from "../assignment-panel";
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

  // Tudo o que só depende de `cycle` (já carregado acima) vai no mesmo
  // lote — reduz o número de idas e voltas à BD, importante sob o
  // connection_limit=1 do pooler do Supabase em produção.
  const [templates, employees, departments, assignedEmployees] = await Promise.all([
    prisma.shiftTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { AND: [scope, { status: "ACTIVE" }] },
      select: { id: true, firstName: true, lastName: true, weeklyHours: true, departmentId: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { id: { in: cycle.assignments.map((a) => a.employeeId) } } }),
  ]);
  const employeeMap = new Map(assignedEmployees.map((e) => [e.id, e]));

  const departmentsWithEmployees = departments
    .map((d) => ({
      id: d.id,
      name: d.name,
      employees: employees
        .filter((e) => e.departmentId === d.id)
        .map((e) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName, weeklyHours: e.weeklyHours })),
    }))
    .filter((d) => d.employees.length > 0);

  const initialAssignments = cycle.assignments.map((a) => ({
    id: a.id,
    employeeId: a.employeeId,
    offsetWeeks: a.offsetWeeks,
    firstName: employeeMap.get(a.employeeId)?.firstName ?? "",
    lastName: employeeMap.get(a.employeeId)?.lastName ?? "",
  }));

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
            {canEdit && <DeleteCycleButton cycleId={cycle.id} cycleName={cycle.name} />}
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
              <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
                Colaboradores Associados
              </h2>
              <CycleAssignmentPanel
                cycleId={cycle.id}
                cycleWeeks={cycle.weeks}
                departments={departmentsWithEmployees}
                initialAssignments={initialAssignments}
                canEdit={canEdit}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
