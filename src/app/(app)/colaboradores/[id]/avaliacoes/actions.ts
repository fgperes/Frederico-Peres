"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { logAudit } from "@/lib/audit";
import {
  getEligibleTemplates,
  computeResult,
  computeScaleScore,
  matchConsequence,
  resolveEvaluationTasks,
  type Respondent,
} from "@/lib/evaluations";
import { revalidatePath } from "next/cache";

export async function scheduleEvaluation(employeeId: string, templateId: string, scheduledDate: string) {
  const user = await requireUser();
  if (!canWrite(user.roles, "avaliacoes")) throw new Error("Sem permissão para agendar avaliações.");

  const scope = await employeeScopeWhere(user);
  const employee = await prisma.employee.findFirst({ where: { AND: [{ id: employeeId }, scope] } });
  if (!employee) throw new Error("Colaborador fora do seu âmbito de gestão.");

  const date = new Date(`${scheduledDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Data inválida.");

  const eligible = await getEligibleTemplates(employeeId);
  const template = eligible.find((t) => t.id === templateId);
  if (!template) throw new Error("Este modelo não está atribuído a este colaborador.");

  const evaluation = await prisma.evaluation.create({
    data: { templateId, employeeId, scheduledDate: date, createdById: user.id },
  });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "Evaluation",
    entityId: evaluation.id,
    details: `Agendou a avaliação "${template.name}" de ${employee.firstName} ${employee.lastName} para ${date.toLocaleDateString("pt-PT")}`,
  });

  revalidatePath(`/colaboradores/${employeeId}/avaliacoes`);

  return {
    id: evaluation.id,
    templateId,
    templateName: template.name,
    scheduledDate: date.toISOString(),
    status: evaluation.status,
    hasSelfEvaluation: template.hasSelfEvaluation,
  };
}

export type AnswerInput = {
  questionId: string;
  // Só para SCALE: valor bruto escolhido pelo avaliador (ex.: 3 numa escala
  // de 1 a 5) — a pontuação é calculada a partir daqui, proporcional ao
  // peso da pergunta.
  rawValue?: number;
  selectedOptionId?: string;
  textValue?: string;
};

export async function submitEvaluationAnswers(
  evaluationId: string,
  respondent: Respondent,
  answers: AnswerInput[]
) {
  const user = await requireUser();

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
      template: {
        include: {
          questions: { include: { options: true } },
          consequenceRules: true,
        },
      },
    },
  });
  if (!evaluation) throw new Error("Avaliação não encontrada.");

  if (respondent === "MANAGER") {
    if (!canWrite(user.roles, "avaliacoes")) throw new Error("Sem permissão para preencher avaliações.");
    const scope = await employeeScopeWhere(user);
    const inScope = await prisma.employee.findFirst({ where: { AND: [{ id: evaluation.employeeId }, scope] } });
    if (!inScope) throw new Error("Colaborador fora do seu âmbito de gestão.");
  } else {
    if (user.employeeId !== evaluation.employeeId) {
      throw new Error("Só o próprio colaborador pode preencher a sua autoavaliação.");
    }
    if (!evaluation.template.hasSelfEvaluation) throw new Error("Este modelo não permite autoavaliação.");
  }

  const resolvedAnswers: {
    questionId: string;
    score: number | null;
    rawValue: number | null;
    selectedOptionId: string | null;
    textValue: string | null;
  }[] = [];

  for (const question of evaluation.template.questions) {
    const answer = answers.find((a) => a.questionId === question.id);

    if (question.type === "TEXT") {
      resolvedAnswers.push({
        questionId: question.id,
        score: null,
        rawValue: null,
        selectedOptionId: null,
        textValue: answer?.textValue?.trim() || null,
      });
      continue;
    }

    if (question.type === "SCALE") {
      const rawValue = answer?.rawValue;
      const scaleMin = question.scaleMin ?? 0;
      const scaleMax = question.scaleMax ?? question.maxScore;
      if (rawValue === undefined || rawValue === null || Number.isNaN(rawValue)) {
        throw new Error(`Falta responder à pergunta "${question.text}".`);
      }
      if (rawValue < scaleMin || rawValue > scaleMax) {
        throw new Error(`Valor inválido para "${question.text}" (${scaleMin}-${scaleMax}).`);
      }
      const score = computeScaleScore(rawValue, scaleMax, question.maxScore);
      resolvedAnswers.push({ questionId: question.id, score, rawValue, selectedOptionId: null, textValue: null });
      continue;
    }

    // SINGLE_CHOICE
    const option = question.options.find((o) => o.id === answer?.selectedOptionId);
    if (!option) throw new Error(`Falta escolher uma opção para "${question.text}".`);
    resolvedAnswers.push({
      questionId: question.id,
      score: option.points,
      rawValue: null,
      selectedOptionId: option.id,
      textValue: null,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.evaluationAnswer.deleteMany({ where: { evaluationId, respondent } });
    await tx.evaluationAnswer.createMany({
      data: resolvedAnswers.map((a) => ({ evaluationId, respondent, ...a })),
    });

    const { score, percent } = computeResult(resolvedAnswers, evaluation.template.questions);

    if (respondent === "MANAGER") {
      const consequence = matchConsequence(percent, evaluation.template.consequenceRules);
      await tx.evaluation.update({
        where: { id: evaluationId },
        data: {
          status: "COMPLETED",
          managerCompletedAt: new Date(),
          managerCompletedById: user.id,
          managerScore: score,
          managerPercent: percent,
          managerConsequence: consequence,
        },
      });
    } else {
      await tx.evaluation.update({
        where: { id: evaluationId },
        data: { selfCompletedAt: new Date(), selfScore: score, selfPercent: percent },
      });
    }
  });

  await resolveEvaluationTasks(evaluationId, respondent);

  const employeeName = `${evaluation.employee.firstName} ${evaluation.employee.lastName}`;
  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "Evaluation",
    entityId: evaluationId,
    details:
      respondent === "MANAGER"
        ? `Preencheu a avaliação de desempenho de ${employeeName}`
        : `Preencheu a autoavaliação de desempenho de ${employeeName}`,
  });

  revalidatePath(`/colaboradores/${evaluation.employeeId}/avaliacoes`);
  return { employeeId: evaluation.employeeId };
}
