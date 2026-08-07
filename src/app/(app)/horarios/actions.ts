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

  const existing = await prisma.shiftTemplate.findUnique({ where: { name } });
  if (existing) throw new Error(`Já existe um modelo de turno com o nome "${name}".`);

  const template = await prisma.shiftTemplate.create({
    data: { name, startTime, endTime, breakMins, color },
  });

  await logAudit({ userId: user.id, action: "CREATE", entity: "ShiftTemplate", entityId: template.id, details: name });
  revalidatePath("/horarios/modelos");
}

export type CreateShiftTemplateState = { error?: string };

export async function createShiftTemplateAction(
  _prev: CreateShiftTemplateState,
  formData: FormData
): Promise<CreateShiftTemplateState> {
  try {
    await createShiftTemplate(formData);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar o modelo de turno." };
  }
}

export async function updateShiftTemplate(templateId: string, formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const breakMins = Number(formData.get("breakMins") ?? 0);
  const color = String(formData.get("color") ?? "#2563eb");

  if (!name || !startTime || !endTime) throw new Error("Campos obrigatórios em falta.");

  const existing = await prisma.shiftTemplate.findUnique({ where: { name } });
  if (existing && existing.id !== templateId) {
    throw new Error(`Já existe um modelo de turno com o nome "${name}".`);
  }

  await prisma.shiftTemplate.update({
    where: { id: templateId },
    data: { name, startTime, endTime, breakMins, color },
  });

  await logAudit({ userId: user.id, action: "UPDATE", entity: "ShiftTemplate", entityId: templateId, details: name });
  revalidatePath("/horarios/modelos");
}

export async function deleteShiftTemplate(templateId: string) {
  const user = await assertCanWrite();

  const template = await prisma.shiftTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: { _count: { select: { shifts: true, scheduleCyclePatterns: true } } },
  });
  if (template._count.shifts > 0 || template._count.scheduleCyclePatterns > 0) {
    throw new Error("Só é possível apagar um modelo de turno que não esteja a ser usado em nenhuma escala ou ciclo.");
  }

  await prisma.shiftTemplate.delete({ where: { id: templateId } });
  await logAudit({ userId: user.id, action: "DELETE", entity: "ShiftTemplate", entityId: templateId, details: template.name });
  revalidatePath("/horarios/modelos");
}
