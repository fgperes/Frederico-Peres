"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// O gestor de RH pode anular um movimento da bolsa de horas — fica marcado
// (reversedAt/reversedById) em vez de apagado, para o histórico continuar
// auditável.
export async function reverseHourPoolMovementAction(movementId: string): Promise<{ error?: string }> {
  try {
    const user = await requireUser();
    if (!canWrite(user.roles, "picagens")) {
      throw new Error("Sem permissão para anular movimentos da bolsa de horas.");
    }

    const movement = await prisma.hourPoolMovement.findUniqueOrThrow({ where: { id: movementId } });
    if (movement.reversedAt) throw new Error("Este movimento já foi anulado.");

    await prisma.hourPoolMovement.update({
      where: { id: movementId },
      data: { reversedAt: new Date(), reversedById: user.id },
    });

    await logAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "HourPoolMovement",
      entityId: movementId,
      details: `Movimento de bolsa de horas anulado (${movement.minutes} min, ${movement.date.toISOString().slice(0, 10)})`,
    });

    revalidatePath(`/colaboradores/${movement.employeeId}/bolsa-horas`);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível anular o movimento." };
  }
}
