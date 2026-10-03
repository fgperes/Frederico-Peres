"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { differenceInCalendarDays } from "date-fns";
import { isoDate } from "@/lib/dates";
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

function parseDay(iso: string): Date {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  if (Number.isNaN(d.getTime())) throw new Error("Data inválida.");
  return d;
}

function assertTimeFormat(value: string, label: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error(`${label} inválida — use o formato HH:MM.`);
  }
}

export type CreateShiftResult = { created: number; skippedExisting: number; skippedDueToAbsence: number };

// Cria o mesmo turno (horário + modelo) para um ou vários dias de uma só
// vez. Nunca substitui um turno já existente nesse dia — fica assinalado
// como ignorado, para o utilizador decidir (editar o existente em vez de
// criar um novo).
export async function createShiftAction(
  employeeId: string,
  dateIsos: string[],
  startTime: string,
  endTime: string,
  shiftTemplateId: string | null,
  notes?: string
): Promise<ActionResult<CreateShiftResult>> {
  return safe(async () => {
    const user = await assertCanWrite();
    if (!employeeId) throw new Error("Selecione um colaborador.");
    if (dateIsos.length === 0) throw new Error("Selecione pelo menos um dia.");
    assertTimeFormat(startTime, "Hora de início");
    assertTimeFormat(endTime, "Hora de fim");

    const days = dateIsos.map(parseDay);

    const [existingShifts, absences] = await Promise.all([
      prisma.shift.findMany({ where: { employeeId, date: { in: days } }, select: { date: true } }),
      prisma.absence.findMany({
        where: { employeeId, status: "APPROVED", startDate: { lte: days[days.length - 1] }, endDate: { gte: days[0] } },
      }),
    ]);
    const existingDates = new Set(existingShifts.map((s) => isoDate(s.date)));

    let created = 0;
    let skippedExisting = 0;
    let skippedDueToAbsence = 0;

    for (const day of days) {
      const dayIso = isoDate(day);
      if (existingDates.has(dayIso)) {
        skippedExisting++;
        continue;
      }
      const absent = absences.some((a) => a.startDate <= day && a.endDate >= day);
      if (absent) {
        skippedDueToAbsence++;
        continue;
      }
      await prisma.shift.create({
        data: {
          employeeId,
          date: day,
          startTime,
          endTime,
          shiftTemplateId: shiftTemplateId || null,
          source: "MANUAL",
          status: "DRAFT",
          notes: notes || null,
        },
      });
      created++;
    }

    await logAudit({
      userId: user.id,
      action: "CREATE",
      entity: "Shift",
      details: `Turno manual criado para ${dateIsos.length} dia(s) (colaborador ${employeeId}): ${created} criado(s), ${skippedExisting} já tinham turno, ${skippedDueToAbsence} ignorado(s) por ausência`,
    });

    revalidatePath("/escalas");
    return { created, skippedExisting, skippedDueToAbsence };
  });
}

// Edita um turno existente — incluindo já publicado (correção pontual).
// Se já estava publicado, fica assinalado como alterado após a publicação
// (a grelha destaca-o numa cor própria) em vez de voltar a rascunho.
export async function updateShiftAction(
  shiftId: string,
  data: { startTime: string; endTime: string; shiftTemplateId: string | null; notes?: string }
): Promise<ActionResult<void>> {
  return safe(async () => {
    const user = await assertCanWrite();
    assertTimeFormat(data.startTime, "Hora de início");
    assertTimeFormat(data.endTime, "Hora de fim");

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new Error("Turno não encontrado.");

    await prisma.shift.update({
      where: { id: shiftId },
      data: {
        startTime: data.startTime,
        endTime: data.endTime,
        shiftTemplateId: data.shiftTemplateId || null,
        notes: data.notes || null,
        ...(shift.status === "PUBLISHED" ? { editedAfterPublish: true } : {}),
      },
    });

    await logAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "Shift",
      entityId: shiftId,
      details: `Turno editado (${shift.status === "PUBLISHED" ? "já publicado" : "rascunho"}): ${data.startTime}-${data.endTime}`,
    });

    revalidatePath("/escalas");
  });
}

async function assertTargetCellFree(employeeId: string, date: Date, excludeShiftId?: string) {
  const existing = await prisma.shift.findFirst({
    where: { employeeId, date, ...(excludeShiftId ? { id: { not: excludeShiftId } } : {}) },
  });
  if (existing) {
    throw new Error("Já existe um turno nesse dia para este colaborador.");
  }
}

// Mover um turno (arrastar para outra célula): muda colaborador e/ou dia.
// Se já estava publicado, mantém-se publicado mas fica assinalado como
// alterado após publicação.
export async function moveShiftAction(
  shiftId: string,
  newEmployeeId: string,
  newDateIso: string
): Promise<ActionResult<void>> {
  return safe(async () => {
    const user = await assertCanWrite();
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new Error("Turno não encontrado.");
    const newDate = parseDay(newDateIso);

    await assertTargetCellFree(newEmployeeId, newDate, shiftId);

    await prisma.shift.update({
      where: { id: shiftId },
      data: {
        employeeId: newEmployeeId,
        date: newDate,
        ...(shift.status === "PUBLISHED" ? { editedAfterPublish: true } : {}),
      },
    });

    await logAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "Shift",
      entityId: shiftId,
      details: `Turno movido para ${newEmployeeId} em ${newDateIso}`,
    });

    revalidatePath("/escalas");
  });
}

// Copiar um turno (arrastar com Ctrl/Alt): cria um novo turno em rascunho
// com o mesmo horário, sem alterar o original.
export async function copyShiftAction(
  shiftId: string,
  newEmployeeId: string,
  newDateIso: string
): Promise<ActionResult<void>> {
  return safe(async () => {
    const user = await assertCanWrite();
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new Error("Turno não encontrado.");
    const newDate = parseDay(newDateIso);

    await assertTargetCellFree(newEmployeeId, newDate);

    const created = await prisma.shift.create({
      data: {
        employeeId: newEmployeeId,
        date: newDate,
        startTime: shift.startTime,
        endTime: shift.endTime,
        shiftTemplateId: shift.shiftTemplateId,
        source: "MANUAL",
        status: "DRAFT",
        notes: shift.notes,
      },
    });

    await logAudit({
      userId: user.id,
      action: "CREATE",
      entity: "Shift",
      entityId: created.id,
      details: `Turno copiado de ${shiftId} para ${newEmployeeId} em ${newDateIso}`,
    });

    revalidatePath("/escalas");
  });
}

// Elimina um único turno — só em rascunho (publicados são imutáveis a
// eliminar, tal como na eliminação em lote; podem ser corrigidos via
// updateShiftAction/moveShiftAction).
export async function deleteSingleShiftAction(shiftId: string): Promise<ActionResult<void>> {
  return safe(async () => {
    const user = await assertCanWrite();
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new Error("Turno não encontrado.");
    if (shift.status === "PUBLISHED") {
      throw new Error("Turnos publicados não podem ser eliminados — edite-o ou contacte um administrador.");
    }

    await prisma.shift.delete({ where: { id: shiftId } });

    await logAudit({
      userId: user.id,
      action: "DELETE",
      entity: "Shift",
      entityId: shiftId,
      details: `Turno em rascunho eliminado individualmente`,
    });

    revalidatePath("/escalas");
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
