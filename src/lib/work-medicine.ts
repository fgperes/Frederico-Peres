import { prisma } from "@/lib/prisma";
import { addYears } from "date-fns";
import { logAudit } from "@/lib/audit";
import { getMatrixSnapshot } from "@/lib/roles";

// Medicina do Trabalho — por lei, cada colaborador tem de ser examinado pelo
// menos uma vez a cada 2 anos. O processo de cada colaborador segue sempre:
//
//   AGENDADA               data futura marcada; pode ser reagendada.
//   A_CONFIRMAR_REALIZACAO chegou a data; aguarda confirmação de que foi
//                          realizada (gerada por ensureWorkMedicineTasks,
//                          sem cron disponível — ver evaluations.ts). Ainda
//                          pode ser reagendada (não aconteceu).
//   PENDENTE_RESULTADO     realização confirmada; aguarda resultado.
//   FECHADA                resultado registado (ver resultStatus); conta
//                          como a última realizada para o próximo ciclo.
//
// Não há notificação persistida: tal como o resto da aplicação (ver
// getNotifications), o aviso ao colaborador é computado a partir do estado
// atual do agendamento (ver getUpcomingWorkMedicineAppointment), e os avisos
// a quem gere o processo são Tasks (ver ensureWorkMedicineTasks), geradas em
// cada carregamento de página.

export const WORK_MEDICINE_DUE_WINDOW_DAYS = 30;
export const WORK_MEDICINE_INTERVAL_YEARS = 2;

export const WORK_MEDICINE_STATUSES = [
  "AGENDADA",
  "A_CONFIRMAR_REALIZACAO",
  "PENDENTE_RESULTADO",
  "FECHADA",
] as const;
export type WorkMedicineStatus = (typeof WORK_MEDICINE_STATUSES)[number];

export const WORK_MEDICINE_STATUS_LABELS: Record<WorkMedicineStatus, string> = {
  AGENDADA: "Agendada",
  A_CONFIRMAR_REALIZACAO: "A confirmar realização",
  PENDENTE_RESULTADO: "Pendente de resultado",
  FECHADA: "Fechada",
};

export const WORK_MEDICINE_RESULT_LABELS: Record<string, string> = {
  APTO: "Apto",
  NAO_APTO: "Não apto",
};

// Utilizadores que recebem as tarefas de gestão do processo — qualquer
// perfil a quem o Administrador do Sistema tenha dado acesso de escrita ao
// módulo "Medicina do Trabalho" em Perfis e Acessos (é essa a forma, já
// existente na aplicação, de "definir o perfil" responsável).
async function getResponsibleUserIds(): Promise<string[]> {
  const matrix = getMatrixSnapshot();
  const rwRoles = Object.keys(matrix).filter((role) => matrix[role]?.medicina_trabalho === "rw");
  if (rwRoles.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { active: true, roles: { some: { role: { in: rwRoles } } } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

// Chamado logo após a criação de um colaborador (manual ou importação em
// massa) — dispara a tarefa para agendar a primeira medicina do trabalho.
export async function notifyNewEmployeeWorkMedicine(employeeId: string, employeeName: string): Promise<void> {
  const assigneeIds = await getResponsibleUserIds();
  if (assigneeIds.length === 0) return;

  await prisma.task.createMany({
    data: assigneeIds.map((assigneeId) => ({
      title: `Agendar medicina do trabalho — ${employeeName}`,
      description: `${employeeName} acabou de ser admitido(a). Agende a medicina do trabalho em Medicina do Trabalho → Agendamento, ou na ficha do colaborador.`,
      type: "WORK_MEDICINE_NEW_EMPLOYEE",
      assigneeId,
      employeeId,
    })),
  });
}

// Chamado em cada carregamento de página (ver src/app/(app)/layout.tsx),
// tal como ensureEvaluationDueTasks — não há cron disponível neste ambiente.
export async function ensureWorkMedicineTasks(): Promise<void> {
  await Promise.all([ensureDueReminderTasks(), ensureConfirmationTasks()]);
}

// Colaboradores ativos cujo próximo ciclo de 2 anos (desde a última medicina
// do trabalho fechada, ou desde a admissão se ainda não tiveram nenhuma)
// está a menos de 30 dias — cria (se ainda não existir) uma tarefa a avisar
// quem gere o processo.
async function ensureDueReminderTasks(): Promise<void> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + WORK_MEDICINE_DUE_WINDOW_DAYS);

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE", hireDate: { not: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      hireDate: true,
      workMedicineAppointments: {
        where: { status: "FECHADA" },
        orderBy: { scheduledAt: "desc" },
        take: 1,
        select: { scheduledAt: true },
      },
    },
  });

  const assigneeIds = await getResponsibleUserIds();
  if (assigneeIds.length === 0) return;

  const rowsToCreate: {
    title: string;
    description: string;
    type: string;
    assigneeId: string;
    employeeId: string;
  }[] = [];

  for (const employee of employees) {
    const lastClosed = employee.workMedicineAppointments[0]?.scheduledAt ?? employee.hireDate!;
    const nextDueDate = addYears(lastClosed, WORK_MEDICINE_INTERVAL_YEARS);
    if (nextDueDate > threshold) continue;

    const hasOpenAppointment = await prisma.workMedicineAppointment.findFirst({
      where: { employeeId: employee.id, status: { not: "FECHADA" } },
      select: { id: true },
    });
    if (hasOpenAppointment) continue;

    const existingTask = await prisma.task.findFirst({
      where: {
        employeeId: employee.id,
        type: { in: ["WORK_MEDICINE_DUE", "WORK_MEDICINE_NEW_EMPLOYEE"] },
        status: "OPEN",
      },
      select: { id: true },
    });
    if (existingTask) continue;

    const employeeName = `${employee.firstName} ${employee.lastName}`;
    const dateLabel = nextDueDate.toLocaleDateString("pt-PT");
    for (const assigneeId of assigneeIds) {
      rowsToCreate.push({
        title: `Medicina do trabalho a renovar — ${employeeName}`,
        description: `${employeeName} atinge o limite legal de 2 anos em ${dateLabel}. Agende a próxima medicina do trabalho.`,
        type: "WORK_MEDICINE_DUE",
        assigneeId,
        employeeId: employee.id,
      });
    }
  }

  if (rowsToCreate.length > 0) {
    await prisma.task.createMany({ data: rowsToCreate });
  }
}

// Agendamentos cuja data já chegou — passam a "a confirmar realização" e
// geram a tarefa correspondente (uma única vez por agendamento).
async function ensureConfirmationTasks(): Promise<void> {
  const now = new Date();

  const due = await prisma.workMedicineAppointment.findMany({
    where: { status: "AGENDADA", scheduledAt: { lte: now } },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      tasks: { where: { status: "OPEN", type: "WORK_MEDICINE_CONFIRM" }, select: { id: true } },
    },
  });
  if (due.length === 0) return;

  const assigneeIds = await getResponsibleUserIds();

  for (const appointment of due) {
    await prisma.workMedicineAppointment.update({
      where: { id: appointment.id },
      data: { status: "A_CONFIRMAR_REALIZACAO" },
    });

    if (appointment.tasks.length > 0 || assigneeIds.length === 0) continue;

    const employeeName = `${appointment.employee.firstName} ${appointment.employee.lastName}`;
    await prisma.task.createMany({
      data: assigneeIds.map((assigneeId) => ({
        title: `Confirmar realização — medicina do trabalho de ${employeeName}`,
        description: `A medicina do trabalho de ${employeeName} estava agendada para hoje. Confirme se foi realizada (ou reagende) na ficha do colaborador.`,
        type: "WORK_MEDICINE_CONFIRM",
        assigneeId,
        employeeId: appointment.employeeId,
        workMedicineAppointmentId: appointment.id,
      })),
    });
  }
}

async function resolveOpenTasksFor(employeeId: string, types: string[], appointmentId?: string) {
  await prisma.task.updateMany({
    where: {
      employeeId,
      type: { in: types },
      status: "OPEN",
      ...(appointmentId ? { workMedicineAppointmentId: appointmentId } : {}),
    },
    data: { status: "DONE", resolvedAt: new Date() },
  });
}

export async function scheduleWorkMedicineAppointment(params: {
  employeeId: string;
  entityId: string | null;
  addressId: string | null;
  scheduledAt: Date;
  createdById: string;
}) {
  const appointment = await prisma.workMedicineAppointment.create({
    data: {
      employeeId: params.employeeId,
      entityId: params.entityId,
      addressId: params.addressId,
      scheduledAt: params.scheduledAt,
      status: "AGENDADA",
      createdById: params.createdById,
    },
  });

  // Cobre o ciclo em aberto — já não é preciso lembrar ninguém de agendar.
  await resolveOpenTasksFor(params.employeeId, ["WORK_MEDICINE_NEW_EMPLOYEE", "WORK_MEDICINE_DUE"]);

  await logAudit({
    userId: params.createdById,
    action: "SCHEDULE",
    entity: "WorkMedicineAppointment",
    entityId: appointment.id,
  });

  return appointment;
}

export async function rescheduleWorkMedicineAppointment(params: {
  appointmentId: string;
  scheduledAt: Date;
  entityId: string | null;
  addressId: string | null;
  userId: string;
}) {
  const current = await prisma.workMedicineAppointment.findUnique({ where: { id: params.appointmentId } });
  if (!current) throw new Error("Agendamento não encontrado.");
  if (current.status !== "AGENDADA" && current.status !== "A_CONFIRMAR_REALIZACAO") {
    throw new Error("Este agendamento já não pode ser reagendado.");
  }

  const updated = await prisma.workMedicineAppointment.update({
    where: { id: params.appointmentId },
    data: {
      scheduledAt: params.scheduledAt,
      entityId: params.entityId,
      addressId: params.addressId,
      status: "AGENDADA",
    },
  });

  await resolveOpenTasksFor(current.employeeId, ["WORK_MEDICINE_CONFIRM"], current.id);

  await logAudit({
    userId: params.userId,
    action: "RESCHEDULE",
    entity: "WorkMedicineAppointment",
    entityId: updated.id,
  });

  return updated;
}

export async function confirmWorkMedicineRealization(params: { appointmentId: string; userId: string }) {
  const current = await prisma.workMedicineAppointment.findUnique({ where: { id: params.appointmentId } });
  if (!current) throw new Error("Agendamento não encontrado.");
  if (current.status !== "A_CONFIRMAR_REALIZACAO") {
    throw new Error("Este agendamento não está à espera de confirmação de realização.");
  }

  const updated = await prisma.workMedicineAppointment.update({
    where: { id: params.appointmentId },
    data: { status: "PENDENTE_RESULTADO", realizationConfirmedAt: new Date() },
  });

  await resolveOpenTasksFor(current.employeeId, ["WORK_MEDICINE_CONFIRM"], current.id);

  await logAudit({
    userId: params.userId,
    action: "CONFIRM_REALIZATION",
    entity: "WorkMedicineAppointment",
    entityId: updated.id,
  });

  return updated;
}

export async function closeWorkMedicineAppointment(params: {
  appointmentId: string;
  userId: string;
  resultStatus: "APTO" | "NAO_APTO";
  resultNotes?: string | null;
  documentName?: string | null;
  documentType?: string | null;
  documentData?: string | null;
}) {
  const current = await prisma.workMedicineAppointment.findUnique({ where: { id: params.appointmentId } });
  if (!current) throw new Error("Agendamento não encontrado.");
  if (current.status !== "PENDENTE_RESULTADO") {
    throw new Error("Este agendamento ainda não está pendente de resultado.");
  }

  const updated = await prisma.workMedicineAppointment.update({
    where: { id: params.appointmentId },
    data: {
      status: "FECHADA",
      resultStatus: params.resultStatus,
      resultNotes: params.resultNotes ?? null,
      resultDocumentName: params.documentName ?? null,
      resultDocumentType: params.documentType ?? null,
      resultDocumentData: params.documentData ?? null,
      closedAt: new Date(),
      closedById: params.userId,
    },
  });

  await logAudit({
    userId: params.userId,
    action: "CLOSE",
    entity: "WorkMedicineAppointment",
    entityId: updated.id,
    details: params.resultStatus,
  });

  return updated;
}
