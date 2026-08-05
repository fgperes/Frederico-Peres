import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { TemplateForm } from "../template-form";
import { notFound, redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

export default async function EditarModeloAvaliacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!canWrite(user.roles, "avaliacoes")) redirect("/dashboard");

  const [template, teams, employees] = await Promise.all([
    prisma.evaluationTemplate.findUnique({
      where: { id },
      include: {
        sections: { orderBy: { order: "asc" } },
        questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
        consequenceRules: true,
        assignments: true,
        evaluations: { select: { id: true }, take: 1 },
      },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" }, include: { department: true } }),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  if (!template) notFound();

  // Modelos criados antes das secções existirem podem ter perguntas sem
  // sectionId — ficam agrupadas numa secção "extra" só para não perdermos
  // dados antigos ao abrir o construtor.
  const FALLBACK_SECTION_KEY = "__sem_seccao__";
  const hasOrphanQuestions = template.questions.some((q) => !q.sectionId);
  const sections = template.sections.map((s) => ({ key: s.id, title: s.title }));
  if (sections.length === 0 || hasOrphanQuestions) {
    sections.push({ key: FALLBACK_SECTION_KEY, title: sections.length > 0 ? "Sem secção" : "Secção 1" });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={ClipboardCheck} title={`Editar modelo — ${template.name}`} />
      <TemplateForm
        teams={teams.map((t) => ({ id: t.id, name: t.name, departmentName: t.department.name }))}
        employees={employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }))}
        initial={{
          id: template.id,
          name: template.name,
          hasSelfEvaluation: template.hasSelfEvaluation,
          sections,
          questions: template.questions.map((q) => ({
            key: q.id,
            sectionKey: q.sectionId ?? FALLBACK_SECTION_KEY,
            text: q.text,
            type: q.type as "SCALE" | "SINGLE_CHOICE" | "TEXT",
            maxScore: q.maxScore,
            scaleMin: q.scaleMin ?? 1,
            scaleMax: q.scaleMax ?? 5,
            options: q.options.map((o) => ({ key: o.id, label: o.label, points: o.points })),
          })),
          consequenceRules: template.consequenceRules.map((r) => ({
            key: r.id,
            minPercent: r.minPercent,
            consequence: r.consequence,
          })),
          teamIds: template.assignments.map((a) => a.teamId).filter((v): v is string => !!v),
          employeeIds: template.assignments.map((a) => a.employeeId).filter((v): v is string => !!v),
          isUsed: template.evaluations.length > 0,
        }}
      />
    </div>
  );
}
