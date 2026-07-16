"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "recursos")) {
    throw new Error("Sem permissão para editar a estrutura organizacional.");
  }
  return user;
}

export async function createDepartment(formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || null;
  if (!name) throw new Error("Nome obrigatório.");

  const dept = await prisma.department.create({ data: { name, parentId } });
  await logAudit({ userId: user.id, action: "CREATE", entity: "Department", entityId: dept.id, details: name });
  revalidatePath("/estrutura");
}

export async function createTeam(formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const departmentId = String(formData.get("departmentId") ?? "");
  if (!name || !departmentId) throw new Error("Nome e departamento obrigatórios.");

  const team = await prisma.team.create({ data: { name, departmentId } });
  await logAudit({ userId: user.id, action: "CREATE", entity: "Team", entityId: team.id, details: name });
  revalidatePath("/estrutura");
}

export async function createLocation(formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!name) throw new Error("Nome obrigatório.");

  const location = await prisma.location.create({ data: { name, address } });
  await logAudit({ userId: user.id, action: "CREATE", entity: "Location", entityId: location.id, details: name });
  revalidatePath("/estrutura");
}
