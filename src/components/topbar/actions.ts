"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canMessageRecipient } from "@/lib/messaging";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type SendMessageState = { error?: string; success?: boolean };

export async function sendMessageAction(
  _prev: SendMessageState,
  formData: FormData
): Promise<SendMessageState> {
  const user = await requireUser();
  const recipientId = String(formData.get("recipientId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!recipientId) return { error: "Selecione um destinatário." };
  if (!body) return { error: "Escreva uma mensagem." };
  if (body.length > 1000) return { error: "Mensagem demasiado longa (máx. 1000 caracteres)." };

  const allowed = await canMessageRecipient(user, recipientId);
  if (!allowed) return { error: "Não tem permissão para enviar mensagens a este destinatário." };

  const message = await prisma.message.create({
    data: { senderId: user.id, recipientId, body },
  });

  await logAudit({
    userId: user.id,
    action: "SEND_MESSAGE",
    entity: "Message",
    entityId: message.id,
    details: `Para ${recipientId}`,
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function markMessageRead(messageId: string) {
  const user = await requireUser();
  await prisma.message.updateMany({
    where: { id: messageId, recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}

export async function markAllMessagesRead() {
  const user = await requireUser();
  await prisma.message.updateMany({
    where: { recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}

export async function completeTask(taskId: string) {
  const user = await requireUser();
  const task = await prisma.task.updateMany({
    where: { id: taskId, assigneeId: user.id, status: "OPEN" },
    data: { status: "DONE", resolvedAt: new Date() },
  });
  if (task.count > 0) {
    await logAudit({ userId: user.id, action: "DONE", entity: "Task", entityId: taskId });
  }
  revalidatePath("/", "layout");
}
