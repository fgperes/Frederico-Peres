import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader } from "@/components/ui";
import { AnswerForm } from "../answer-form";
import { notFound, redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

const FALLBACK_SECTION_KEY = "__sem_seccao__";

export default async function AutoavaliacaoPage({
  params,
}: {
  params: Promise<{ id: string; evaluationId: string }>;
}) {
  const { id, evaluationId } = await params;
  const user = await requireUser();
  if (user.employeeId !== id) redirect(`/colaboradores/${id}/avaliacoes`);

  const scope = await employeeScopeWhere(user);
  const employee = await prisma.employee.findFirst({ where: { AND: [{ id }, scope] } });
  if (!employee) notFound();

  const evaluation = await prisma.evaluation.findFirst({
    where: { id: evaluationId, employeeId: employee.id },
    include: {
      template: {
        include: {
          sections: { orderBy: { order: "asc" } },
          questions: { include: { options: true }, orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!evaluation) notFound();
  if (!evaluation.template.hasSelfEvaluation || evaluation.selfCompletedAt) {
    redirect(`/colaboradores/${id}/avaliacoes`);
  }

  const sections = evaluation.template.sections.map((s) => ({ key: s.id, title: s.title }));
  if (evaluation.template.questions.some((q) => !q.sectionId)) {
    sections.push({ key: FALLBACK_SECTION_KEY, title: "Outras perguntas" });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        icon={ClipboardCheck}
        title="Autoavaliação"
        description={evaluation.template.name}
      />
      <AnswerForm
        evaluationId={evaluation.id}
        respondent="SELF"
        sections={sections}
        questions={evaluation.template.questions.map((q) => ({
          id: q.id,
          sectionKey: q.sectionId ?? FALLBACK_SECTION_KEY,
          text: q.text,
          type: q.type as "SCALE" | "SINGLE_CHOICE" | "TEXT",
          maxScore: q.maxScore,
          scaleMin: q.scaleMin ?? 1,
          scaleMax: q.scaleMax ?? 5,
          options: q.options,
        }))}
      />
    </div>
  );
}
