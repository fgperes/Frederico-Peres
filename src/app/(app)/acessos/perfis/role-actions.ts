"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isSystemAdmin, ROLES, applyRoleCreate, applyRoleUpdate, applyRoleDelete } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

async function assertSystemAdmin() {
  const user = await requireUser();
  if (!isSystemAdmin(user.roles)) {
    throw new Error("Apenas o Administrador do Sistema pode gerir perfis.");
  }
  return user;
}

function slugifyKey(label: string): string {
  const base = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "PERFIL";
}

function revalidateAll() {
  revalidatePath("/acessos");
  revalidatePath("/acessos/perfis");
  revalidatePath("/", "layout");
}

export async function createRole(formData: FormData) {
  const admin = await assertSystemAdmin();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Indique um nome para o perfil.");
  if (label.length > 60) throw new Error("O nome do perfil é demasiado longo (máx. 60 caracteres).");

  let key = slugifyKey(label);
  if (ROLES.includes(key)) {
    let n = 2;
    while (ROLES.includes(`${key}_${n}`)) n++;
    key = `${key}_${n}`;
  }

  const def = await prisma.roleDefinition.create({
    data: { key, label, isSystem: false, updatedById: admin.id },
  });

  applyRoleCreate({ key: def.key, label: def.label, isSystem: def.isSystem });

  await logAudit({
    userId: admin.id,
    action: "CREATE",
    entity: "RoleDefinition",
    entityId: def.id,
    details: `Criou o perfil "${label}"`,
  });

  revalidateAll();
}

export async function updateRole(id: string, formData: FormData) {
  const admin = await assertSystemAdmin();

  const existing = await prisma.roleDefinition.findUnique({ where: { id } });
  if (!existing) throw new Error("Perfil não encontrado.");
  if (existing.isSystem) {
    throw new Error("Este é um perfil do sistema e o seu nome não pode ser alterado.");
  }

  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Indique um nome para o perfil.");
  if (label.length > 60) throw new Error("O nome do perfil é demasiado longo (máx. 60 caracteres).");

  const def = await prisma.roleDefinition.update({
    where: { id },
    data: { label, updatedById: admin.id },
  });

  applyRoleUpdate(def.key, def.label);

  await logAudit({
    userId: admin.id,
    action: "UPDATE",
    entity: "RoleDefinition",
    entityId: def.id,
    details: `Renomeou o perfil para "${label}"`,
  });

  revalidateAll();
}

export async function deleteRole(id: string) {
  const admin = await assertSystemAdmin();

  const def = await prisma.roleDefinition.findUnique({ where: { id } });
  if (!def) throw new Error("Perfil não encontrado.");
  if (def.isSystem) {
    throw new Error("Este é um perfil do sistema e não pode ser eliminado.");
  }

  const usersWithRole = await prisma.userRole.count({ where: { role: def.key } });
  if (usersWithRole > 0) {
    throw new Error(
      `Não é possível eliminar: ${usersWithRole} utilizador(es) têm este perfil atribuído.`
    );
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { role: def.key } }),
    prisma.roleDefinition.delete({ where: { id } }),
  ]);

  applyRoleDelete(def.key);

  await logAudit({
    userId: admin.id,
    action: "DELETE",
    entity: "RoleDefinition",
    details: `Eliminou o perfil "${def.label}"`,
  });

  revalidateAll();
}
