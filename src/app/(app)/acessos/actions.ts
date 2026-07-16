"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isSystemAdmin, ROLES, type Role } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function generatePassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*-+=";
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[crypto.randomInt(set.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = Array.from({ length: length - required.length }, () => pick(all));
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

async function assertSystemAdmin() {
  const user = await requireUser();
  if (!isSystemAdmin(user.roles)) {
    throw new Error("Apenas o Administrador do Sistema pode gerir acessos.");
  }
  return user;
}

export type CreateUserState = { error?: string; success?: { email: string; password: string } };

export async function createUserAction(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const admin = await assertSystemAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const employeeId = String(formData.get("employeeId") ?? "") || null;
  const selectedRoles = formData.getAll("roles").map(String) as Role[];

  if (!name || !email) return { error: "Nome e email são obrigatórios." };
  if (selectedRoles.length === 0) return { error: "Selecione pelo menos um perfil." };
  if (!selectedRoles.every((r) => (ROLES as readonly string[]).includes(r))) {
    return { error: "Perfil inválido." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Já existe um utilizador com este email." };

  const password = generatePassword(14);
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      mustChangePassword: true,
      employee: employeeId ? { connect: { id: employeeId } } : undefined,
      roles: { create: selectedRoles.map((role) => ({ role })) },
    },
  });

  await logAudit({
    userId: admin.id,
    action: "CREATE",
    entity: "User",
    entityId: user.id,
    details: `Criado ${email} com perfis: ${selectedRoles.join(", ")}`,
  });

  revalidatePath("/acessos");
  return { success: { email, password } };
}

export async function toggleUserActive(userId: string, active: boolean) {
  const admin = await assertSystemAdmin();
  const user = await prisma.user.update({ where: { id: userId }, data: { active } });
  await logAudit({
    userId: admin.id,
    action: active ? "ACTIVATE" : "DEACTIVATE",
    entity: "User",
    entityId: user.id,
    details: user.email,
  });
  revalidatePath("/acessos");
}

export async function updateUserRoles(userId: string, formData: FormData) {
  const admin = await assertSystemAdmin();
  const selectedRoles = formData.getAll("roles").map(String) as Role[];
  const departmentId = String(formData.get("departmentId") ?? "") || null;

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
    userId: admin.id,
    action: "UPDATE_ROLES",
    entity: "User",
    entityId: userId,
    details: `Perfis: ${selectedRoles.join(", ") || "nenhum"}`,
  });

  revalidatePath("/acessos");
}
