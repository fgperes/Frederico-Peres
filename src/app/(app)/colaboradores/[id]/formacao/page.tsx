import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRead } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getEmployeeTrainingBalances } from "@/lib/training";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ColaboradorTabs } from "../tabs";
import { User } from "lucide-react";
import { FormacaoEmployeePanel } from "./formacao-panel";

export default async function ColaboradorFormacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!canRead(user.roles, "formacao")) redirect(`/colaboradores/${id}`);
  const scope = await employeeScopeWhere(user);

  const employee = await prisma.employee.findFirst({ where: { AND: [{ id }, scope] } });
  if (!employee) notFound();

  const employeeName = `${employee.firstName} ${employee.lastName}`;

  const [enrollments, trainingAbsences, balances] = await Promise.all([
    prisma.trainingEnrollment.findMany({
      where: { employeeId: employee.id },
      include: {
        training: {
          include: {
            modality: { select: { code: true, description: true } },
            entity: { select: { name: true } },
            sessions: { orderBy: { date: "asc" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.absence.findMany({
      where: { employeeId: employee.id, countsAsTraining: true, status: "APPROVED" },
      select: { startDate: true, endDate: true, trainingHours: true, absenceType: { select: { name: true } } },
    }),
    getEmployeeTrainingBalances(employee.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={User} title={employeeName} description={employee.jobTitle} />
      <ColaboradorTabs employeeId={employee.id} />
      <FormacaoEmployeePanel
        balances={balances}
        trainings={enrollments.map((e) => {
          const totalHours = e.training.sessions.reduce((sum, s) => sum + s.hours, 0);
          return {
            id: e.training.id,
            name: e.training.name,
            modalityLabel: `${e.training.modality.code} — ${e.training.modality.description}`,
            entityName: e.training.entity?.name ?? null,
            totalHours,
            firstDate: e.training.sessions[0]?.date.toISOString() ?? null,
            lastDate: e.training.sessions[e.training.sessions.length - 1]?.date.toISOString() ?? null,
          };
        })}
        trainingAbsences={trainingAbsences.map((a) => ({
          typeName: a.absenceType.name,
          startDate: a.startDate.toISOString(),
          endDate: a.endDate.toISOString(),
          hours: a.trainingHours ?? 0,
        }))}
      />
    </div>
  );
}
