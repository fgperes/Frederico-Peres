import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accessFor, canWrite } from "@/lib/roles";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { GraduationCap } from "lucide-react";
import { FormacaoTabs } from "../tabs";
import { FormacoesPanel } from "./formacoes-panel";

export default async function FormacoesPage() {
  const user = await requireUser();
  const access = accessFor(user.roles, "formacao");
  if (access === "own") redirect("/formacao");
  if (access !== "rw" && access !== "ro") redirect("/dashboard");
  const canEdit = canWrite(user.roles, "formacao");

  const [trainings, modalities, entities, employees] = await Promise.all([
    prisma.training.findMany({
      include: {
        modality: { select: { name: true } },
        entity: { select: { name: true } },
        sessions: { orderBy: { date: "asc" } },
        enrollments: { include: { employee: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.trainingModality.findMany({ orderBy: { name: "asc" } }),
    prisma.trainingEntity.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        icon={GraduationCap}
        title="Formação"
        description="Registo de formações, cronograma e colaboradores inscritos."
      />
      <FormacaoTabs />
      <FormacoesPanel
        canEdit={canEdit}
        modalities={modalities.map((m) => ({ id: m.id, name: m.name, active: m.active }))}
        entities={entities.map((e) => ({ id: e.id, name: e.name }))}
        employees={employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }))}
        initialTrainings={trainings.map((t) => ({
          id: t.id,
          name: t.name,
          modalityName: t.modality.name,
          entityName: t.entity?.name ?? null,
          description: t.description,
          totalHours: t.sessions.reduce((sum, s) => sum + s.hours, 0),
          firstDate: t.sessions[0]?.date.toISOString() ?? null,
          lastDate: t.sessions[t.sessions.length - 1]?.date.toISOString() ?? null,
          sessionCount: t.sessions.length,
          enrolledEmployeeIds: t.enrollments.map((e) => e.employeeId),
          enrolledNames: t.enrollments.map((e) => `${e.employee.firstName} ${e.employee.lastName}`),
        }))}
      />
    </div>
  );
}
