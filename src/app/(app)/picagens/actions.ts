"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { classifyDeviation } from "@/lib/timeclock";

// PI-01: registo de picagem via browser, autenticado por colaborador.
export async function clockAction(type: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END") {
  const user = await requireUser();
  if (!user.employeeId) throw new Error("Utilizador sem ficha de colaborador associada.");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const shift = await prisma.shift.findFirst({
    where: { employeeId: user.employeeId, date: { gte: todayStart, lte: todayEnd } },
  });

  let hasDeviation = false;
  let deviationType: string | null = null;

  // PI-02: comparar automaticamente com o horário planeado.
  if (type === "CLOCK_IN" || type === "CLOCK_OUT") {
    const result = classifyDeviation(type, now, shift?.startTime, shift?.endTime);
    hasDeviation = result.hasDeviation;
    deviationType = result.deviationType;
  }

  const entry = await prisma.timeClockEntry.create({
    data: {
      employeeId: user.employeeId,
      type,
      timestamp: now,
      hasDeviation,
      deviationType,
      justificationStatus: hasDeviation ? "PENDING" : null,
    },
  });

  await logAudit({
    userId: user.id,
    action: "CLOCK",
    entity: "TimeClockEntry",
    entityId: entry.id,
    details: type,
  });

  revalidatePath("/picagens");
}

// PI-03: colaborador submete justificação para picagem em falta/incorreta.
export async function submitJustification(entryId: string, formData: FormData) {
  const user = await requireUser();
  const justification = String(formData.get("justification") ?? "").trim();
  if (!justification) throw new Error("Indique uma justificação.");

  const entry = await prisma.timeClockEntry.findUniqueOrThrow({ where: { id: entryId } });
  if (entry.employeeId !== user.employeeId && !canWrite(user.roles, "picagens")) {
    throw new Error("Sem permissão.");
  }

  await prisma.timeClockEntry.update({
    where: { id: entryId },
    data: { justification, justificationStatus: "PENDING" },
  });

  await logAudit({ userId: user.id, action: "JUSTIFY", entity: "TimeClockEntry", entityId: entryId });
  revalidatePath("/picagens");
}

// PI-04: gestor aprova ou rejeita justificações de picagem.
export async function reviewJustification(entryId: string, status: "APPROVED" | "REJECTED") {
  const user = await requireUser();
  if (!canWrite(user.roles, "picagens")) throw new Error("Sem permissão para rever picagens.");

  const entry = await prisma.timeClockEntry.update({
    where: { id: entryId },
    data: { justificationStatus: status, reviewedById: user.id },
  });

  await logAudit({
    userId: user.id,
    action: status === "APPROVED" ? "APPROVE" : "REJECT",
    entity: "TimeClockEntry",
    entityId: entry.id,
  });

  revalidatePath("/picagens");
}
