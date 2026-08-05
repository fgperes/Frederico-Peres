import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader } from "@/components/ui";
import { AnswerForm } from "../answer-form";
import { notFound, redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

export default async function PreencherAvaliacaoPage({
  params,
}: {
  params: Promise<{ id: string; evaluationId: string }>;
}) {
  const { id, evaluationId } = await params;
  const user = await requireUser();
  if (!canWrite(user.roles, "avaliacoes")) redirect(`/colaboradores/${id}/avaliacoes`);

  const scope = await employeeScopeWhere(user);
  const employee = await prisma.employee.findFirst({ where: { AND: [{ id }, scope] } });
  if (!employee) notFound();

  const evaluation = await prisma.evaluation.findFirst({
    where: { id: evaluationId, employeeId: employee.id },
    include: { template: { include: { questions: { include: { options: true }, orderBy: { order: "asc" } } } } },
  });
  if (!evaluation) notFound();
  if (evaluation.status === "COMPLETED") redirect(`/colaboradores/${id}/avaliacoes`);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        icon={ClipboardCheck}
        title={`Avaliação — ${employee.firstName} ${employee.lastName}`}
        description={evaluation.template.name}
      />
      <AnswerForm
        evaluationId={evaluation.id}
        respondent="MANAGER"
        questions={evaluation.template.questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type as "SCALE" | "SINGLE_CHOICE" | "TEXT",
          maxScore: q.maxScore,
          options: q.options,
        }))}
      />
    </div>
  );
}
