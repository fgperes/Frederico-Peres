import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getEligibleTemplates } from "@/lib/evaluations";
import { PageHeader } from "@/components/ui";
import { ColaboradorTabs } from "../tabs";
import { AvaliacoesPanel, type EvaluationRow } from "./avaliacoes-panel";
import type { EvaluationPdfData } from "@/components/evaluations/evaluation-pdf-button";
import { notFound, redirect } from "next/navigation";
import { User } from "lucide-react";

const FALLBACK_SECTION_KEY = "__sem_seccao__";

type QuestionWithOptions = {
  id: string;
  sectionId: string | null;
  text: string;
  type: string;
  maxScore: number;
  scaleMin: number | null;
  scaleMax: number | null;
  options: { id: string; label: string; points: number }[];
};

function buildPdfData(
  employeeName: string,
  templateName: string,
  scheduledDate: Date,
  respondent: "MANAGER" | "SELF",
  sectionTitleById: Map<string, string>,
  questions: QuestionWithOptions[],
  answers: {
    questionId: string;
    score: number | null;
    rawValue: number | null;
    selectedOptionId: string | null;
    textValue: string | null;
  }[],
  totalPercent: number | null,
  consequence: string | null
): EvaluationPdfData {
  return {
    employeeName,
    templateName,
    scheduledDateLabel: scheduledDate.toLocaleDateString("pt-PT"),
    respondent,
    totalPercent,
    consequence,
    questions: questions.map((q) => {
      const answer = answers.find((a) => a.questionId === q.id);
      const sectionTitle = sectionTitleById.get(q.sectionId ?? FALLBACK_SECTION_KEY) ?? "";
      if (q.type === "TEXT") {
        return { sectionTitle, text: q.text, answerLabel: answer?.textValue?.trim() || "—", scoreLabel: "—" };
      }
      if (q.type === "SINGLE_CHOICE") {
        const option = q.options.find((o) => o.id === answer?.selectedOptionId);
        return {
          sectionTitle,
          text: q.text,
          answerLabel: option?.label ?? "—",
          scoreLabel: answer?.score != null ? `${answer.score} pt(s)` : "—",
        };
      }
      // SCALE
      return {
        sectionTitle,
        text: q.text,
        answerLabel:
          answer?.rawValue != null ? `${answer.rawValue}/${q.scaleMax ?? q.maxScore}` : "—",
        scoreLabel: answer?.score != null ? `${answer.score} pt(s)` : "—",
      };
    }),
  };
}

export default async function ColaboradorAvaliacoesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const scope = await employeeScopeWhere(user);

  const employee = await prisma.employee.findFirst({ where: { AND: [{ id }, scope] } });
  if (!employee) notFound();

  const isSelf = user.employeeId === employee.id;
  const canManageEvals = canWrite(user.roles, "avaliacoes");
  if (!canManageEvals && !isSelf) redirect(`/colaboradores/${id}`);

  const employeeName = `${employee.firstName} ${employee.lastName}`;

  const [evaluations, eligibleTemplates] = await Promise.all([
    prisma.evaluation.findMany({
      where: { employeeId: employee.id },
      include: {
        template: {
          include: {
            sections: { orderBy: { order: "asc" } },
            questions: { include: { options: true }, orderBy: { order: "asc" } },
          },
        },
        answers: true,
      },
      orderBy: { scheduledDate: "desc" },
    }),
    canManageEvals ? getEligibleTemplates(employee.id) : Promise.resolve([]),
  ]);

  const rows: EvaluationRow[] = evaluations.map((e) => {
    const managerAnswers = e.answers.filter((a) => a.respondent === "MANAGER");
    const selfAnswers = e.answers.filter((a) => a.respondent === "SELF");
    const sectionTitleById = new Map(e.template.sections.map((s) => [s.id, s.title]));
    if (e.template.questions.some((q) => !q.sectionId)) {
      sectionTitleById.set(FALLBACK_SECTION_KEY, "Outras perguntas");
    }

    return {
      id: e.id,
      templateId: e.templateId,
      templateName: e.template.name,
      hasSelfEvaluation: e.template.hasSelfEvaluation,
      scheduledDate: e.scheduledDate.toISOString(),
      status: e.status as "SCHEDULED" | "COMPLETED" | "CANCELLED",
      managerPercent: e.managerPercent,
      managerConsequence: e.managerConsequence,
      managerCompletedAt: e.managerCompletedAt ? e.managerCompletedAt.toISOString() : null,
      selfCompletedAt: e.selfCompletedAt ? e.selfCompletedAt.toISOString() : null,
      selfPercent: e.selfPercent,
      managerPdfData: e.managerCompletedAt
        ? buildPdfData(
            employeeName,
            e.template.name,
            e.scheduledDate,
            "MANAGER",
            sectionTitleById,
            e.template.questions,
            managerAnswers,
            e.managerPercent,
            e.managerConsequence
          )
        : null,
      selfPdfData: e.selfCompletedAt
        ? buildPdfData(
            employeeName,
            e.template.name,
            e.scheduledDate,
            "SELF",
            sectionTitleById,
            e.template.questions,
            selfAnswers,
            e.selfPercent,
            null
          )
        : null,
    };
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={User} title={employeeName} description={employee.jobTitle} />

      <ColaboradorTabs employeeId={employee.id} />

      <AvaliacoesPanel
        employeeId={employee.id}
        initialEvaluations={rows}
        eligibleTemplates={eligibleTemplates.map((t) => ({ id: t.id, name: t.name }))}
        canManageEvals={canManageEvals}
        isSelf={isSelf}
      />
    </div>
  );
}
