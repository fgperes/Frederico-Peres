"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "horarios")) {
    throw new Error("Sem permissão para editar horários.");
  }
  return user;
}

export async function createShiftTemplate(formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const breakMins = Number(formData.get("breakMins") ?? 0);
  const color = String(formData.get("color") ?? "#2563eb");

  if (!name || !startTime || !endTime) throw new Error("Campos obrigatórios em falta.");

  const template = await prisma.shiftTemplate.create({
    data: { name, startTime, endTime, breakMins, color },
  });

  await logAudit({ userId: user.id, action: "CREATE", entity: "ShiftTemplate", entityId: template.id, details: name });
  revalidatePath("/horarios/modelos");
}
