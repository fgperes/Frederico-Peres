"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export type ChangePasswordState = { error?: string; success?: boolean };

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const user = await requireUser();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 10) {
    return { error: "A nova password deve ter pelo menos 10 caracteres." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "As passwords não coincidem." };
  }

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!valid) return { error: "Password atual incorreta." };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  await logAudit({ userId: user.id, action: "CHANGE_PASSWORD", entity: "User", entityId: user.id });

  return { success: true };
}
