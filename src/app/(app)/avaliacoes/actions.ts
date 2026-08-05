"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { validateTemplateWeights, validateScaleBounds, type QuestionType } from "@/lib/evaluations";
import { revalidatePath } from "next/cache";

export type TemplateSectionInput = { key: string; title: string };

export type TemplateQuestionInput = {
  sectionKey: string;
  text: string;
  type: QuestionType;
  maxScore: number;
  scaleMin?: number;
  scaleMax?: number;
  options: { label: string; points: number }[];
};

export type TemplateConsequenceInput = { minPercent: number; consequence: string };

export type TemplatePayload = {
  name: string;
  hasSelfEvaluation: boolean;
  sections: TemplateSectionInput[];
  questions: TemplateQuestionInput[];
  consequenceRules: TemplateConsequenceInput[];
  teamIds: string[];
  employeeIds: string[];
};

function validatePayload(payload: TemplatePayload) {
  if (!payload.name.trim()) throw new Error("Indique um nome para o modelo.");
  if (payload.sections.length === 0) throw new Error("Adicione pelo menos uma secção.");
  for (const s of payload.sections) {
    if (!s.title.trim()) throw new Error("Todas as secções têm de ter um título.");
  }
  if (payload.questions.length === 0) throw new Error("Adicione pelo menos uma pergunta.");

  const sectionKeys = new Set(payload.sections.map((s) => s.key));
  for (const q of payload.questions) {
    if (!sectionKeys.has(q.sectionKey)) {
      throw new Error(`A pergunta "${q.text}" não está associada a nenhuma secção.`);
    }
  }

  validateTemplateWeights(payload.questions);
  validateScaleBounds(
    payload.questions.map((q) => ({
      text: q.text,
      type: q.type,
      scaleMin: q.scaleMin ?? null,
      scaleMax: q.scaleMax ?? null,
    }))
  );

  for (const q of payload.questions) {
    if (!q.text.trim()) throw new Error("Todas as perguntas têm de ter um enunciado.");
    if (q.type === "SINGLE_CHOICE") {
      if (q.options.length < 2) throw new Error(`A pergunta "${q.text}" precisa de pelo menos 2 opções.`);
      for (const opt of q.options) {
        if (!opt.label.trim()) throw new Error(`A pergunta "${q.text}" tem uma opção sem texto.`);
        if (opt.points < 0 || opt.points > q.maxScore) {
          throw new Error(
            `A opção "${opt.label}" tem uma pontuação fora do intervalo permitido (0-${q.maxScore}).`
          );
        }
      }
    }
  }
  for (const rule of payload.consequenceRules) {
    if (rule.minPercent < 0 || rule.minPercent > 100) throw new Error("A percentagem mínima tem de estar entre 0 e 100.");
    if (!rule.consequence.trim()) throw new Error("Todas as regras de consequência têm de ter um texto.");
  }
}

function assignmentsCreateData(payload: TemplatePayload) {
  return [
    ...payload.teamIds.map((teamId) => ({ teamId })),
    ...payload.employeeIds.map((employeeId) => ({ employeeId })),
  ];
}

// Cria as secções (para obter os IDs reais) e só depois as perguntas,
// resolvendo `sectionKey` (identificador local do formulário) para o
// sectionId real de cada uma.
async function createSectionsAndQuestions(
  tx: Prisma.TransactionClient,
  templateId: string,
  payload: TemplatePayload
) {
  const sectionIdByKey = new Map<string, string>();
  for (const [i, s] of payload.sections.entries()) {
    const created = await tx.evaluationSection.create({
      data: { templateId, order: i, title: s.title.trim() },
    });
    sectionIdByKey.set(s.key, created.id);
  }

  for (const [i, q] of payload.questions.entries()) {
    const sectionId = sectionIdByKey.get(q.sectionKey);
    if (!sectionId) throw new Error(`Secção inválida para a pergunta "${q.text}".`);
    await tx.evaluationQuestion.create({
      data: {
        templateId,
        sectionId,
        order: i,
        text: q.text.trim(),
        type: q.type,
        maxScore: q.type === "TEXT" ? 0 : q.maxScore,
        scaleMin: q.type === "SCALE" ? q.scaleMin : null,
        scaleMax: q.type === "SCALE" ? q.scaleMax : null,
        options:
          q.type === "SINGLE_CHOICE"
            ? { create: q.options.map((o, oi) => ({ order: oi, label: o.label.trim(), points: o.points })) }
            : undefined,
      },
    });
  }
}

export async function createTemplate(payload: TemplatePayload) {
  const user = await requireUser();
  if (!canWrite(user.roles, "avaliacoes")) throw new Error("Sem permissão para gerir modelos de avaliação.");
  validatePayload(payload);

  const templateId = await prisma.$transaction(async (tx) => {
    const template = await tx.evaluationTemplate.create({
      data: {
        name: payload.name.trim(),
        hasSelfEvaluation: payload.hasSelfEvaluation,
        createdById: user.id,
        consequenceRules: { create: payload.consequenceRules },
        assignments: { create: assignmentsCreateData(payload) },
      },
    });
    await createSectionsAndQuestions(tx, template.id, payload);
    return template.id;
  });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "EvaluationTemplate",
    entityId: templateId,
    details: `Criou o modelo de avaliação "${payload.name.trim()}"`,
  });

  revalidatePath("/avaliacoes");
  return { id: templateId };
}

// Editar um modelo já usado (com avaliações associadas) nunca mexe nas
// secções/perguntas/opções — apagá-las em cascata destruiria as respostas
// já dadas nessas avaliações. Só nome, autoavaliação, consequências e
// atribuições são editáveis nesse caso; um modelo ainda sem avaliações pode
// ser reconstruído por inteiro.
export async function updateTemplate(templateId: string, payload: TemplatePayload) {
  const user = await requireUser();
  if (!canWrite(user.roles, "avaliacoes")) throw new Error("Sem permissão para gerir modelos de avaliação.");

  const existing = await prisma.evaluationTemplate.findUnique({
    where: { id: templateId },
    include: { evaluations: { select: { id: true }, take: 1 } },
  });
  if (!existing) throw new Error("Modelo não encontrado.");

  const isUsed = existing.evaluations.length > 0;
  if (!isUsed) validatePayload(payload);
  else {
    if (!payload.name.trim()) throw new Error("Indique um nome para o modelo.");
    for (const rule of payload.consequenceRules) {
      if (rule.minPercent < 0 || rule.minPercent > 100) throw new Error("A percentagem mínima tem de estar entre 0 e 100.");
      if (!rule.consequence.trim()) throw new Error("Todas as regras de consequência têm de ter um texto.");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.evaluationTemplate.update({
      where: { id: templateId },
      data: { name: payload.name.trim(), hasSelfEvaluation: payload.hasSelfEvaluation },
    });

    await tx.evaluationConsequenceRule.deleteMany({ where: { templateId } });
    await tx.evaluationConsequenceRule.createMany({
      data: payload.consequenceRules.map((r) => ({ ...r, templateId })),
    });

    await tx.evaluationTemplateAssignment.deleteMany({ where: { templateId } });
    await tx.evaluationTemplateAssignment.createMany({
      data: assignmentsCreateData(payload).map((a) => ({ ...a, templateId })),
    });

    if (!isUsed) {
      // Cascata: apaga secções → perguntas → opções.
      await tx.evaluationSection.deleteMany({ where: { templateId } });
      await createSectionsAndQuestions(tx, templateId, payload);
    }
  });

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "EvaluationTemplate",
    entityId: templateId,
    details: `Editou o modelo de avaliação "${payload.name.trim()}"`,
  });

  revalidatePath("/avaliacoes");
  revalidatePath(`/avaliacoes/${templateId}`);
}

export async function deleteTemplate(templateId: string) {
  const user = await requireUser();
  if (!canWrite(user.roles, "avaliacoes")) throw new Error("Sem permissão para gerir modelos de avaliação.");

  const existing = await prisma.evaluationTemplate.findUnique({
    where: { id: templateId },
    include: { evaluations: { select: { id: true }, take: 1 } },
  });
  if (!existing) return;
  if (existing.evaluations.length > 0) {
    throw new Error("Não é possível eliminar um modelo com avaliações já criadas.");
  }

  await prisma.evaluationTemplate.delete({ where: { id: templateId } });
  await logAudit({
    userId: user.id,
    action: "DELETE",
    entity: "EvaluationTemplate",
    entityId: templateId,
    details: `Eliminou o modelo de avaliação "${existing.name}"`,
  });
  revalidatePath("/avaliacoes");
}
