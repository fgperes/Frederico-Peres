"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getModuleSubscription } from "@/lib/subscriptions";
import { computeDayDiffMinutes } from "@/lib/time-clock";

export type CorrectionState = { error?: string; success?: boolean };

// Quem pode corrigir o horário real de um dia: quem gere Picagens, ou o
// próprio colaborador a corrigir o seu próprio dia — fica sempre registada
// como alteração manual (motivo opcional, autor e auditoria).
function canCorrectOwnOrManaged(
  user: Awaited<ReturnType<typeof requireUser>>,
  employeeId: string
): boolean {
  return canWrite(user.roles, "picagens") || user.employeeId === employeeId;
}

const TIME_RE = /^\d{2}:\d{2}$/;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Só o real (picagens) é corrigível, e por horário (início/fim), não por
// número de horas — o previsto vem sempre da escala. Uma correção
// existente para o mesmo colaborador/dia é substituída (upsert), nunca
// acumulada.
export async function setActualTimesCorrectionAction(
  _prev: CorrectionState,
  formData: FormData
): Promise<CorrectionState> {
  const user = await requireUser();

  const employeeId = String(formData.get("employeeId") ?? "");
  if (!canCorrectOwnOrManaged(user, employeeId)) {
    return { error: "Sem permissão para corrigir este horário." };
  }

  const date = String(formData.get("date") ?? "");
  const rawHours = Number(formData.get("rawHours"));
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!employeeId || !date) return { error: "Dados em falta." };
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return { error: "Indique a hora de início e de fim." };
  }

  let totalMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
  if (totalMinutes <= 0) totalMinutes += 24 * 60; // turno que passa a meia-noite
  const minutesDelta = Math.round(totalMinutes - rawHours * 60);

  const correction = await prisma.hoursCorrection.upsert({
    where: { employeeId_date_field: { employeeId, date: new Date(date), field: "ACTUAL" } },
    create: {
      employeeId,
      date: new Date(date),
      field: "ACTUAL",
      startTime,
      endTime,
      minutesDelta,
      reason: reason || null,
      createdById: user.id,
    },
    update: {
      startTime,
      endTime,
      minutesDelta,
      reason: reason || null,
      createdById: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "HoursCorrection",
    entityId: correction.id,
    details: `${employeeId} · ${date} · horário real alterado manualmente para ${startTime}–${endTime}${reason ? ` · ${reason}` : ""}`,
  });

  revalidatePath("/picagens/execucao");
  return { success: true };
}

export async function deleteHoursCorrectionAction(employeeId: string, date: string) {
  const user = await requireUser();
  if (!canCorrectOwnOrManaged(user, employeeId)) {
    throw new Error("Sem permissão para corrigir este horário.");
  }

  await prisma.hoursCorrection.deleteMany({ where: { employeeId, date: new Date(date), field: "ACTUAL" } });

  await logAudit({
    userId: user.id,
    action: "DELETE",
    entity: "HoursCorrection",
    details: `${employeeId} · ${date} · correção do horário real removida`,
  });

  revalidatePath("/picagens/execucao");
}

// ---------------------------------------------------------------------------
// Decisão do gestor de RH sobre o desvio (saldo) de um dia que ultrapassa a
// margem de segurança (ModuleSubscription.timeClockToleranceMinutes).
// ---------------------------------------------------------------------------

export type TimeClockDecisionChoice = "INJUSTIFY" | "JUSTIFY" | "POOL" | "OVERTIME";
export type TimeClockDecisionState = { error?: string; success?: boolean };

// Volta a calcular o desvio no servidor (nunca confia no valor vindo do
// cliente) e decide o destino: Injustificar manda para desconto (>1h) ou
// para a bolsa de horas (≤1h); Justificar liga a um dia de ausência
// aprovada; Bolsa de horas e Hora extra são escolhas explícitas do gestor.
// Uma nova decisão substitui sempre a anterior (upsert), anulando primeiro
// o movimento de bolsa de horas que essa decisão antiga tivesse criado.
export async function decideTimeClockDayAction(
  employeeId: string,
  date: string,
  choice: TimeClockDecisionChoice,
  absenceId?: string
): Promise<TimeClockDecisionState> {
  const user = await requireUser();
  if (!canWrite(user.roles, "picagens")) {
    return { error: "Sem permissão para decidir desvios de picagens." };
  }

  const diffMinutes = await computeDayDiffMinutes(employeeId, date);
  const dateObj = new Date(`${date}T00:00:00.000Z`);

  let decisionType: string;
  let finalAbsenceId: string | null = null;

  if (choice === "JUSTIFY") {
    if (!absenceId) return { error: "Selecione uma ausência." };
    const absence = await prisma.absence.findFirst({
      where: {
        id: absenceId,
        employeeId,
        status: "APPROVED",
        startDate: { lte: dateObj },
        endDate: { gte: dateObj },
      },
    });
    if (!absence) return { error: "Ausência inválida para esta data." };
    decisionType = "JUSTIFIED";
    finalAbsenceId = absence.id;
  } else if (choice === "OVERTIME") {
    if (diffMinutes <= 0) {
      return { error: "Só é possível justificar como hora extra quando o saldo é positivo." };
    }
    decisionType = "OVERTIME";
  } else if (choice === "POOL") {
    decisionType = "POOL";
  } else {
    decisionType = Math.abs(diffMinutes) > 60 ? "DEDUCTION" : "POOL";
  }

  await prisma.hourPoolMovement.updateMany({
    where: { employeeId, date: dateObj, source: "TIME_CLOCK", reversedAt: null },
    data: { reversedAt: new Date(), reversedById: user.id },
  });

  if (decisionType === "POOL") {
    await prisma.hourPoolMovement.create({
      data: {
        employeeId,
        date: dateObj,
        minutes: diffMinutes,
        source: "TIME_CLOCK",
        reason: `Decisão de picagens — desvio de ${date}`,
        createdById: user.id,
      },
    });
  }

  await prisma.timeClockDayDecision.upsert({
    where: { employeeId_date: { employeeId, date: dateObj } },
    create: { employeeId, date: dateObj, diffMinutes, decisionType, absenceId: finalAbsenceId, createdById: user.id },
    update: { diffMinutes, decisionType, absenceId: finalAbsenceId, createdById: user.id },
  });

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "TimeClockDayDecision",
    details: `${employeeId} · ${date} · desvio ${diffMinutes}min → ${decisionType}`,
  });

  revalidatePath("/picagens/execucao");
  revalidatePath(`/colaboradores/${employeeId}/bolsa-horas`);
  return { success: true };
}

export async function removeTimeClockDecisionAction(employeeId: string, date: string): Promise<void> {
  const user = await requireUser();
  if (!canWrite(user.roles, "picagens")) throw new Error("Sem permissão.");

  const dateObj = new Date(`${date}T00:00:00.000Z`);

  await prisma.hourPoolMovement.updateMany({
    where: { employeeId, date: dateObj, source: "TIME_CLOCK", reversedAt: null },
    data: { reversedAt: new Date(), reversedById: user.id },
  });
  await prisma.timeClockDayDecision.deleteMany({ where: { employeeId, date: dateObj } });

  await logAudit({
    userId: user.id,
    action: "DELETE",
    entity: "TimeClockDayDecision",
    details: `${employeeId} · ${date} · decisão removida`,
  });

  revalidatePath("/picagens/execucao");
  revalidatePath(`/colaboradores/${employeeId}/bolsa-horas`);
}

export type JustifiableAbsence = { id: string; typeName: string; startDate: string; endDate: string };

// Ausências aprovadas do colaborador que cobrem esta data — lista mostrada
// no passo "Justificar" para o gestor escolher a qual ligar o desvio.
export async function listJustifiableAbsencesAction(
  employeeId: string,
  date: string
): Promise<JustifiableAbsence[]> {
  const user = await requireUser();
  if (!canWrite(user.roles, "picagens")) throw new Error("Sem permissão.");

  const dateObj = new Date(`${date}T00:00:00.000Z`);
  const absences = await prisma.absence.findMany({
    where: { employeeId, status: "APPROVED", startDate: { lte: dateObj }, endDate: { gte: dateObj } },
    include: { absenceType: true },
    orderBy: { startDate: "desc" },
  });

  return absences.map((a) => ({
    id: a.id,
    typeName: a.absenceType.name,
    startDate: a.startDate.toISOString().slice(0, 10),
    endDate: a.endDate.toISOString().slice(0, 10),
  }));
}

// Margem de segurança (minutos) acima da qual um dia passa a precisar de
// decisão do gestor de RH — gerível por quem tem escrita em Picagens.
export async function setTimeClockToleranceAction(minutes: number): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!canWrite(user.roles, "picagens")) {
    return { error: "Sem permissão para alterar a margem de segurança." };
  }
  if (!Number.isFinite(minutes) || minutes < 0) {
    return { error: "Indique um número de minutos válido." };
  }

  const settings = await getModuleSubscription();
  await prisma.moduleSubscription.update({
    where: { id: settings.id },
    data: { timeClockToleranceMinutes: Math.round(minutes), updatedById: user.id },
  });

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "ModuleSubscription",
    details: `Margem de segurança de picagens definida para ${Math.round(minutes)} min`,
  });

  revalidatePath("/picagens/execucao");
  return {};
}
