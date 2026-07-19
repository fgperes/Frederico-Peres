"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canManageEmployeeAccess, ROLES, type Role } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { generatePassword } from "@/lib/password";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

async function assertCanManage() {
  const user = await requireUser();
  if (!canManageEmployeeAccess(user.roles)) {
    throw new Error("Sem permissão para gerir o acesso deste colaborador.");
  }
  return user;
}

export async function updateEmployeeUserRoles(
  employeeId: string,
  userId: string,
  formData: FormData
) {
  const actor = await assertCanManage();
  const selectedRoles = formData.getAll("roles").map(String) as Role[];
  const departmentId = String(formData.get("departmentId") ?? "") || null;

  if (!selectedRoles.every((r) => (ROLES as readonly string[]).includes(r))) {
    throw new Error("Perfil inválido.");
  }

  await prisma.userRole.deleteMany({ where: { userId } });
  if (selectedRoles.length > 0) {
    await prisma.userRole.createMany({
      data: selectedRoles.map((role) => ({
        userId,
        role,
        departmentId: role === "GESTOR_EQUIPA" ? departmentId : null,
      })),
    });
  }

  await logAudit({
    userId: actor.id,
    action: "UPDATE_ROLES",
    entity: "User",
    entityId: userId,
    details: `Perfis: ${selectedRoles.join(", ") || "nenhum"} (via ficha de colaborador)`,
  });

  revalidatePath(`/colaboradores/${employeeId}`);
  revalidatePath("/acessos");
}

export type ResetPasswordState = { error?: string; password?: string };

export async function resetEmployeeUserPassword(
  employeeId: string,
  userId: string,
  _prev: ResetPasswordState,
  _formData: FormData
): Promise<ResetPasswordState> {
  try {
    const actor = await assertCanManage();

    const password = generatePassword(14);
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true },
    });

    await logAudit({
      userId: actor.id,
      action: "RESET_PASSWORD",
      entity: "User",
      entityId: userId,
      details: "Password redefinida via ficha de colaborador",
    });

    revalidatePath(`/colaboradores/${employeeId}`);
    return { password };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocorreu um erro ao redefinir a password." };
  }
}
