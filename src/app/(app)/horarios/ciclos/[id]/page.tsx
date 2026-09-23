import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge } from "@/components/ui";
import { RefreshCw, Users } from "lucide-react";
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
  const [templates, employees, departments, teams, assignedEmployees] = await Promise.all([
    prisma.shiftTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { AND: [scope, { status: "ACTIVE" }] },
      select: { id: true, firstName: true, lastName: true, weeklyHours: true, departmentId: true, teamId: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { id: { in: cycle.assignments.map((a) => a.employeeId) } } }),
  ]);
  const employeeMap = new Map(assignedEmployees.map((e) => [e.id, e]));

  const departmentsWithEmployees = departments
    .map((d) => ({
      id: d.id,
      name: d.name,
      employees: employees
        .filter((e) => e.departmentId === d.id)
        .map((e) => ({
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          weeklyHours: e.weeklyHours,
          teamId: e.teamId,
        })),
    }))
    .filter((d) => d.employees.length > 0);

  const teamOptions = teams.map((t) => ({ id: t.id, name: t.name, departmentId: t.departmentId }));

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
          <div className="flex flex-wrap items-center gap-2">
            {cycle.isTemplate && <Badge color="blue">Modelo</Badge>}
            {canEdit && !cycle.isTemplate && <SaveTemplateForm cycleId={cycle.id} />}
            {canEdit && <DeleteCycleButton cycleId={cycle.id} cycleName={cycle.name} redirectAfterDelete />}
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

        {canEdit && !cycle.isTemplate && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-900">
              Gerar Escalas
            </h2>
            <GenerateButton cycleId={cycle.id} />
          </Card>
        )}
      </div>

      {!cycle.isTemplate && (
        <Card className="mt-6 border-2 border-violet-200 dark:border-violet-500/30">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/10 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
              <Users size={18} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Colaboradores Associados a este Ciclo
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                É aqui que se atribuem os colaboradores que seguem este ciclo de horário.
              </p>
            </div>
            <Badge color="blue">{initialAssignments.length} associado(s)</Badge>
          </div>
          <CycleAssignmentPanel
            cycleId={cycle.id}
            cycleWeeks={cycle.weeks}
            departments={departmentsWithEmployees}
            teams={teamOptions}
            initialAssignments={initialAssignments}
            canEdit={canEdit}
          />
        </Card>
      )}
    </div>
  );
}
