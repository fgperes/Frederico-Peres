"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  isSystemAdmin,
  ROLES,
  MODULES,
  CONFIGURABLE_ROLES,
  applyMatrixOverrides,
  type Role,
  type Module,
  type AccessLevel,
} from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { generatePassword } from "@/lib/password";

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
  const selectedRoles = formData.getAll("roles").map(String) as Role[];

  if (!name || !email) return { error: "Nome e email são obrigatórios." };
  if (selectedRoles.length === 0) return { error: "Selecione pelo menos um perfil." };
  if (!selectedRoles.every((r) => (ROLES as readonly string[]).includes(r))) {
    return { error: "Perfil inválido." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Já existe um utilizador com este email." };

  // Este formulário cria utilizadores sem ficha de colaborador (ex.: contas
  // de sistema/integrações). Para colaboradores, a conta cria-se na
  // respetiva ficha em Colaboradores.
  const password = generatePassword(14);
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      mustChangePassword: true,
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
  const user = await prisma.user.update({
    where: { id: userId },
    data: { active },
    include: { employee: true },
  });
  await logAudit({
    userId: admin.id,
    action: active ? "ACTIVATE" : "DEACTIVATE",
    entity: "User",
    entityId: user.id,
    details: user.email,
  });

  // Se este utilizador estiver ligado a um colaborador, propaga o estado
  // para a ficha do colaborador (pedido explícito: alterações feitas aqui
  // pelo Administrador do Sistema devem refletir-se na tabela de colaboradores).
  if (user.employee) {
    const status = active ? "ACTIVE" : "INACTIVE";
    await prisma.employee.update({ where: { id: user.employee.id }, data: { status } });
    await logAudit({
      userId: admin.id,
      action: active ? "ACTIVATE" : "DEACTIVATE",
      entity: "Employee",
      entityId: user.employee.id,
      details: `Sincronizado a partir do utilizador ${user.email}`,
    });
    revalidatePath("/colaboradores");
    revalidatePath(`/colaboradores/${user.employee.id}`);
  }

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

const VALID_LEVELS: AccessLevel[] = ["none", "ro", "rw"];

// Grava a matriz de acessos (perfil × módulo) editada em Perfis e Acessos.
// O Colaborador fica de fora (os seus módulos são "own", não configurável
// aqui) e o próprio Administrador do Sistema nunca perde escrita em
// "acessos" — evita ficar bloqueado por engano.
export async function updateRolePermissions(formData: FormData) {
  const admin = await assertSystemAdmin();

  const changes: { role: Role; module: Module; accessLevel: AccessLevel }[] = [];
  for (const role of CONFIGURABLE_ROLES) {
    for (const mod of MODULES) {
      const raw = String(formData.get(`perm_${role}_${mod}`) ?? "none");
      const accessLevel: AccessLevel = VALID_LEVELS.includes(raw as AccessLevel)
        ? (raw as AccessLevel)
        : "none";
      changes.push({ role, module: mod, accessLevel });
    }
  }

  // Salvaguarda: o Administrador do Sistema mantém sempre escrita em Acessos.
  const adminAcessos = changes.find((c) => c.role === "ADMIN_SISTEMA" && c.module === "acessos");
  if (adminAcessos) adminAcessos.accessLevel = "rw";

  await prisma.$transaction(
    changes.map((c) =>
      prisma.rolePermission.upsert({
        where: { role_module: { role: c.role, module: c.module } },
        create: { role: c.role, module: c.module, accessLevel: c.accessLevel, updatedById: admin.id },
        update: { accessLevel: c.accessLevel, updatedById: admin.id },
      })
    )
  );

  applyMatrixOverrides(changes);

  await logAudit({
    userId: admin.id,
    action: "UPDATE",
    entity: "RolePermission",
    details: "Matriz de acessos (perfil × módulo) atualizada",
  });

  revalidatePath("/acessos");
  revalidatePath("/", "layout");
}
