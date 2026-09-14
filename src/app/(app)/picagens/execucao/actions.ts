"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type CorrectionState = { error?: string; success?: boolean };

export async function addHoursCorrectionAction(
  _prev: CorrectionState,
  formData: FormData
): Promise<CorrectionState> {
  const user = await requireUser();
  if (!canWrite(user.roles, "picagens")) {
    return { error: "Sem permissão para corrigir horas." };
  }

  const employeeId = String(formData.get("employeeId") ?? "");
  const date = String(formData.get("date") ?? "");
  const minutesDelta = Number(formData.get("minutesDelta"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!employeeId || !date) return { error: "Dados em falta." };
  if (!Number.isFinite(minutesDelta) || minutesDelta === 0) {
    return { error: "Indique um número de minutos diferente de zero." };
  }
  if (!reason) return { error: "Indique o motivo da correção." };

  const correction = await prisma.hoursCorrection.create({
    data: {
      employeeId,
      date: new Date(date),
      minutesDelta: Math.round(minutesDelta),
      reason,
      createdById: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "HoursCorrection",
    entityId: correction.id,
    details: `${employeeId} · ${date} · ${minutesDelta > 0 ? "+" : ""}${minutesDelta}min · ${reason}`,
  });

  revalidatePath("/picagens/execucao");
  return { success: true };
}
