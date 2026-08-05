import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Módulo de Avaliação de Desempenho — um modelo (EvaluationTemplate) define
// perguntas pontuadas (SCALE/SINGLE_CHOICE, cujo peso soma sempre 100) e
// perguntas de texto livre (TEXT, sem pontuação). Uma Evaluation preenchida
// tem duas respostas possíveis por pergunta: MANAGER (conta para o
// resultado/consequência) e SELF (autoavaliação, sempre só informativa).

export const QUESTION_TYPES = ["SCALE", "SINGLE_CHOICE", "TEXT"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SCALE: "Escala (pontuação numérica)",
  SINGLE_CHOICE: "Escolha única",
  TEXT: "Texto livre (sem pontuação)",
};

export type Respondent = "MANAGER" | "SELF";

const TOTAL_TEMPLATE_POINTS = 100;
const EVALUATION_DUE_WINDOW_DAYS = 30;

// Valida que o peso das perguntas pontuáveis (SCALE/SINGLE_CHOICE) soma
// exatamente 100 — TEXT não conta (peso sempre 0). Lança erro caso contrário.
export function validateTemplateWeights(
  questions: { type: string; maxScore: number }[]
): void {
  const total = questions
    .filter((q) => q.type === "SCALE" || q.type === "SINGLE_CHOICE")
    .reduce((sum, q) => sum + q.maxScore, 0);
  if (total !== TOTAL_TEMPLATE_POINTS) {
    throw new Error(
      `O total dos pesos das perguntas tem de ser exatamente ${TOTAL_TEMPLATE_POINTS} (atual: ${total}).`
    );
  }
}

// Soma as respostas pontuáveis (não-TEXT) de um único respondente. Como os
// pesos somam sempre 100, a pontuação total já É a percentagem.
export function computeResult(
  answers: { questionId: string; score: number | null }[],
  questions: { id: string; type: string }[]
): { score: number; percent: number } {
  const scorableIds = new Set(questions.filter((q) => q.type !== "TEXT").map((q) => q.id));
  const score = answers
    .filter((a) => scorableIds.has(a.questionId))
    .reduce((sum, a) => sum + (a.score ?? 0), 0);
  const percent = Math.max(0, Math.min(100, Math.round(score)));
  return { score, percent };
}

// Escolhe a faixa de consequência com o maior minPercent que ainda seja
// alcançado pela percentagem final (ex.: 72% com faixas 0/41/61 → a de 61).
export function matchConsequence(
  percent: number,
  rules: { minPercent: number; consequence: string }[]
): string | null {
  const sorted = [...rules].sort((a, b) => b.minPercent - a.minPercent);
  const match = sorted.find((r) => percent >= r.minPercent);
  return match?.consequence ?? null;
}

// Modelos disponíveis para um colaborador — atribuídos diretamente a ele ou
// à equipa a que atualmente pertence.
export async function getEligibleTemplates(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { teamId: true },
  });

  const or: Prisma.EvaluationTemplateAssignmentWhereInput[] = [{ employeeId }];
  if (employee?.teamId) or.push({ teamId: employee.teamId });

  return prisma.evaluationTemplate.findMany({
    where: { assignments: { some: { OR: or } } },
    include: { questions: { orderBy: { order: "asc" } } },
    orderBy: { name: "asc" },
  });
}

// Cria (se ainda não existirem) tarefas para quem tem de ser informado de
// uma avaliação agendada para dentro de 30 dias: gestores de equipa do
// departamento do colaborador + Administradores de RH (avaliação do
// gestor), e o próprio colaborador quando o modelo tem autoavaliação e esta
// ainda não foi preenchida. Chamado a cada carregamento de página (sem cron
// disponível), tal como o resto das notificações lazy da aplicação.
export async function ensureEvaluationDueTasks(): Promise<void> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + EVALUATION_DUE_WINDOW_DAYS);

  const dueEvaluations = await prisma.evaluation.findMany({
    where: { status: "SCHEDULED", scheduledDate: { lte: threshold } },
    include: {
      employee: { select: { firstName: true, lastName: true, departmentId: true, userId: true } },
      template: { select: { name: true, hasSelfEvaluation: true } },
      tasks: { where: { status: "OPEN" }, select: { assigneeId: true, type: true } },
    },
  });

  if (dueEvaluations.length === 0) return;

  const rhAdmins = await prisma.user.findMany({
    where: { active: true, roles: { some: { role: "ADMIN_RH" } } },
    select: { id: true },
  });

  const rowsToCreate: {
    title: string;
    description: string;
    type: string;
    assigneeId: string;
    employeeId: string;
    evaluationId: string;
  }[] = [];

  for (const evaluation of dueEvaluations) {
    const employeeName = `${evaluation.employee.firstName} ${evaluation.employee.lastName}`;
    const dateLabel = evaluation.scheduledDate.toLocaleDateString("pt-PT");

    const managerAssigneeIds = new Set<string>(rhAdmins.map((u) => u.id));
    if (evaluation.employee.departmentId) {
      const managers = await prisma.user.findMany({
        where: {
          active: true,
          roles: { some: { role: "GESTOR_EQUIPA", departmentId: evaluation.employee.departmentId } },
        },
        select: { id: true },
      });
      managers.forEach((u) => managerAssigneeIds.add(u.id));
    }

    const existingManagerAssignees = new Set(
      evaluation.tasks.filter((t) => t.type === "EVALUATION_DUE").map((t) => t.assigneeId)
    );
    for (const assigneeId of managerAssigneeIds) {
      if (existingManagerAssignees.has(assigneeId)) continue;
      rowsToCreate.push({
        title: `Avaliação de desempenho agendada — ${employeeName}`,
        description: `A avaliação "${evaluation.template.name}" de ${employeeName} está agendada para ${dateLabel}. Preencha em Colaboradores → ${employeeName} → Avaliações.`,
        type: "EVALUATION_DUE",
        assigneeId,
        employeeId: evaluation.employeeId,
        evaluationId: evaluation.id,
      });
    }

    if (evaluation.template.hasSelfEvaluation && !evaluation.selfCompletedAt && evaluation.employee.userId) {
      const alreadyHasSelfTask = evaluation.tasks.some(
        (t) => t.type === "SELF_EVALUATION_DUE" && t.assigneeId === evaluation.employee.userId
      );
      if (!alreadyHasSelfTask) {
        rowsToCreate.push({
          title: "Autoavaliação de desempenho por preencher",
          description: `Tem uma autoavaliação ("${evaluation.template.name}") para preencher até ${dateLabel}.`,
          type: "SELF_EVALUATION_DUE",
          assigneeId: evaluation.employee.userId,
          employeeId: evaluation.employeeId,
          evaluationId: evaluation.id,
        });
      }
    }
  }

  if (rowsToCreate.length > 0) {
    await prisma.task.createMany({ data: rowsToCreate });
  }
}

// Fecha as tarefas de aviso (gestor/RH e autoavaliação) associadas a uma
// avaliação, depois de preenchida — chamado por submitEvaluationAnswers.
export async function resolveEvaluationTasks(evaluationId: string, respondent: Respondent) {
  await prisma.task.updateMany({
    where: {
      evaluationId,
      status: "OPEN",
      type: respondent === "MANAGER" ? "EVALUATION_DUE" : "SELF_EVALUATION_DUE",
    },
    data: { status: "DONE", resolvedAt: new Date() },
  });
}
