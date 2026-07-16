"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

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
