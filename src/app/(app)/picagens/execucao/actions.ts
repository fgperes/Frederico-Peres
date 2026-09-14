"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type CorrectionState = { error?: string; success?: boolean };

const VALID_FIELDS = ["ACTUAL", "SCHEDULED"];

// O utilizador indica o TOTAL de horas correto para o dia (não um delta) —
// esta ação calcula a diferença face ao valor em bruto (picagens ou
// escala) e grava-a como HoursCorrection. Uma correção existente para o
// mesmo colaborador/dia/lado é substituída (upsert), nunca acumulada.
export async function setHoursCorrectionAction(
  _prev: CorrectionState,
  formData: FormData
): Promise<CorrectionState> {
  const user = await requireUser();
  if (!canWrite(user.roles, "picagens")) {
    return { error: "Sem permissão para corrigir horas." };
  }

  const employeeId = String(formData.get("employeeId") ?? "");
  const date = String(formData.get("date") ?? "");
  const field = String(formData.get("field") ?? "");
  const rawHours = Number(formData.get("rawHours"));
  const newTotalHours = Number(formData.get("newTotalHours"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!employeeId || !date) return { error: "Dados em falta." };
  if (!VALID_FIELDS.includes(field)) return { error: "Campo inválido." };
  if (!Number.isFinite(newTotalHours) || newTotalHours < 0) {
    return { error: "Indique um número de horas válido." };
  }

  const minutesDelta = Math.round((newTotalHours - rawHours) * 60);

  const correction = await prisma.hoursCorrection.upsert({
    where: { employeeId_date_field: { employeeId, date: new Date(date), field } },
    create: {
      employeeId,
      date: new Date(date),
      field,
      minutesDelta,
      reason: reason || null,
      createdById: user.id,
    },
    update: {
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
    details: `${employeeId} · ${date} · ${field === "ACTUAL" ? "real" : "previsto"} corrigido para ${newTotalHours}h${reason ? ` · ${reason}` : ""}`,
  });

  revalidatePath("/picagens/execucao");
  return { success: true };
}

export async function deleteHoursCorrectionAction(employeeId: string, date: string, field: string) {
  const user = await requireUser();
  if (!canWrite(user.roles, "picagens")) throw new Error("Sem permissão para corrigir horas.");

  await prisma.hoursCorrection.deleteMany({ where: { employeeId, date: new Date(date), field } });

  await logAudit({
    userId: user.id,
    action: "DELETE",
    entity: "HoursCorrection",
    details: `${employeeId} · ${date} · ${field === "ACTUAL" ? "real" : "previsto"} · correção removida`,
  });

  revalidatePath("/picagens/execucao");
}
