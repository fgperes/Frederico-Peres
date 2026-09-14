"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { differenceInCalendarDays } from "date-fns";
import { generateSchedulesForEmployees, MIN_GENERATION_RANGE_DAYS, type GenerationIssue } from "@/lib/schedule-generation";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function safe<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ocorreu um erro." };
  }
}

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "horarios")) {
    throw new Error("Sem permissão para gerar/publicar escalas.");
  }
  return user;
}

function parseRange(fromIso: string, toIso: string): { from: Date; to: Date } {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to.getTime() < from.getTime()) {
    throw new Error("Intervalo de datas inválido.");
  }
  if (differenceInCalendarDays(to, from) + 1 < MIN_GENERATION_RANGE_DAYS) {
    throw new Error(`O intervalo tem de ter, no mínimo, ${MIN_GENERATION_RANGE_DAYS} dias (1 semana).`);
  }
  return { from, to };
}

export type GenerateSchedulesResult = { created: number; skippedDueToAbsence: number; issues: GenerationIssue[] };

export async function generateSchedulesAction(
  fromIso: string,
  toIso: string,
  employeeIds: string[]
): Promise<ActionResult<GenerateSchedulesResult>> {
  return safe(async () => {
    const user = await assertCanWrite();
    if (employeeIds.length === 0) throw new Error("Selecione pelo menos um colaborador.");
    const { from, to } = parseRange(fromIso, toIso);

    const result = await generateSchedulesForEmployees(from, to, employeeIds);

    await logAudit({
      userId: user.id,
      action: "GENERATE",
      entity: "Shift",
      details: `Escalas geradas ${fromIso} a ${toIso} para ${employeeIds.length} colaborador(es): ${result.created} turnos criados, ${result.skippedDueToAbsence} ignorados por ausência, ${result.issues.length} com incidências`,
    });

    revalidatePath("/escalas");
    return result;
  });
}

export async function publishSchedulesAction(
  fromIso: string,
  toIso: string,
  employeeIds: string[]
): Promise<ActionResult<{ published: number }>> {
  return safe(async () => {
    const user = await assertCanWrite();
    if (employeeIds.length === 0) throw new Error("Selecione pelo menos um colaborador.");
    const { from, to } = parseRange(fromIso, toIso);

    const result = await prisma.shift.updateMany({
      where: { employeeId: { in: employeeIds }, date: { gte: from, lte: to }, status: "DRAFT" },
      data: { status: "PUBLISHED" },
    });

    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, userId: true },
    });
    const weekLabel = `${from.toLocaleDateString("pt-PT")} a ${to.toLocaleDateString("pt-PT")}`;
    for (const employee of employees) {
      if (!employee.userId) continue;
      await prisma.message.create({
        data: {
          senderId: user.id,
          recipientId: employee.userId,
          body: `O seu horário de ${weekLabel} foi publicado. Consulte em Escalas.`,
        },
      });
    }

    await logAudit({
      userId: user.id,
      action: "PUBLISH",
      entity: "Shift",
      details: `${result.count} turnos publicados (${fromIso} a ${toIso}, ${employeeIds.length} colaborador(es))`,
    });

    revalidatePath("/escalas");
    return { published: result.count };
  });
}

// Turnos publicados são imutáveis: só apaga rascunhos. Se existirem turnos
// já publicados no intervalo/seleção, o resultado informa quantos ficaram
// de fora — o utilizador vê isso explicado no modal de confirmação antes de
// pedir a ação.
export async function deleteSchedulesAction(
  fromIso: string,
  toIso: string,
  employeeIds: string[]
): Promise<ActionResult<{ deleted: number; blockedPublished: number }>> {
  return safe(async () => {
    const user = await assertCanWrite();
    if (employeeIds.length === 0) throw new Error("Selecione pelo menos um colaborador.");
    const { from, to } = parseRange(fromIso, toIso);

    const [deleted, blockedPublished] = await Promise.all([
      prisma.shift.deleteMany({
        where: { employeeId: { in: employeeIds }, date: { gte: from, lte: to }, status: "DRAFT" },
      }),
      prisma.shift.count({
        where: { employeeId: { in: employeeIds }, date: { gte: from, lte: to }, status: "PUBLISHED" },
      }),
    ]);

    await logAudit({
      userId: user.id,
      action: "DELETE",
      entity: "Shift",
      details: `${deleted.count} turnos em rascunho eliminados (${fromIso} a ${toIso}, ${employeeIds.length} colaborador(es)); ${blockedPublished} publicados mantidos (imutáveis)`,
    });

    revalidatePath("/escalas");
    return { deleted: deleted.count, blockedPublished };
  });
}

export type SendScheduleState = {
  error?: string;
  result?: { sent: number; skipped: number };
};

// Envia uma mensagem interna rápida a cada colaborador com conta de
// utilizador, avisando que a escala da semana foi publicada.
export async function sendScheduleNotification(
  _prev: SendScheduleState,
  formData: FormData
): Promise<SendScheduleState> {
  const user = await requireUser();
  if (!canWrite(user.roles, "horarios")) {
    return { error: "Sem permissão para enviar escalas." };
  }

  const employeeIds = formData.getAll("employeeId").map(String);
  const weekLabel = String(formData.get("weekLabel") ?? "");

  if (employeeIds.length === 0) return { error: "Sem colaboradores para notificar." };

  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, userId: true, firstName: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const employee of employees) {
    if (!employee.userId) {
      skipped++;
      continue;
    }
    await prisma.message.create({
      data: {
        senderId: user.id,
        recipientId: employee.userId,
        body: `O seu horário da semana de ${weekLabel} foi publicado. Consulte em Horários.`,
      },
    });
    sent++;
  }

  await logAudit({
    userId: user.id,
    action: "SEND_SCHEDULE",
    entity: "Shift",
    details: `${sent} notificados, ${skipped} sem conta (semana de ${weekLabel})`,
  });

  revalidatePath("/escalas");
  return { result: { sent, skipped } };
}
