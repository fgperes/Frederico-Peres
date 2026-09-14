"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function safe<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ocorreu um erro." };
  }
}

export type EquipmentFormState = { error?: string; success?: boolean };

const EQUIPMENT_TYPES = ["BIOMETRIC", "RFID", "PIN", "MOBILE", "OTHER"];

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "picagens")) {
    throw new Error("Sem permissão para configurar terminais de picagem.");
  }
  return user;
}

export async function createEquipmentAction(
  _prev: EquipmentFormState,
  formData: FormData
): Promise<EquipmentFormState> {
  let user;
  try {
    user = await assertCanWrite();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const departmentId = String(formData.get("departmentId") ?? "") || null;
  const apiEndpoint = String(formData.get("apiEndpoint") ?? "").trim() || null;
  const payloadEmployeeField = String(formData.get("payloadEmployeeField") ?? "").trim() || "employeeExternalId";
  const payloadTypeField = String(formData.get("payloadTypeField") ?? "").trim() || "type";
  const payloadTimestampField = String(formData.get("payloadTimestampField") ?? "").trim() || "timestamp";

  if (!name) return { error: "Indique um nome para o equipamento." };
  if (!EQUIPMENT_TYPES.includes(type)) return { error: "Tipo de equipamento inválido." };

  const equipment = await prisma.equipment.create({
    data: { name, type, departmentId, apiEndpoint, payloadEmployeeField, payloadTypeField, payloadTimestampField },
  });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "Equipment",
    entityId: equipment.id,
    details: `${name} (${type})`,
  });

  revalidatePath("/picagens/terminais");
  return { success: true };
}

export async function updatePayloadMappingAction(
  _prev: EquipmentFormState,
  formData: FormData
): Promise<EquipmentFormState> {
  let user;
  try {
    user = await assertCanWrite();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const equipmentId = String(formData.get("equipmentId") ?? "");
  const payloadEmployeeField = String(formData.get("payloadEmployeeField") ?? "").trim();
  const payloadTypeField = String(formData.get("payloadTypeField") ?? "").trim();
  const payloadTimestampField = String(formData.get("payloadTimestampField") ?? "").trim();

  if (!payloadEmployeeField || !payloadTypeField || !payloadTimestampField) {
    return { error: "Preencha os 3 nomes de campo." };
  }

  const equipment = await prisma.equipment.update({
    where: { id: equipmentId },
    data: { payloadEmployeeField, payloadTypeField, payloadTimestampField },
  });

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "Equipment",
    entityId: equipment.id,
    details: `Mapeamento de campos do webhook atualizado (${equipment.name})`,
  });

  revalidatePath("/picagens/terminais");
  return { success: true };
}

export async function toggleEquipmentActive(equipmentId: string, active: boolean): Promise<ActionResult> {
  return safe(async () => {
    const user = await assertCanWrite();
    const equipment = await prisma.equipment.update({ where: { id: equipmentId }, data: { active } });
    await logAudit({
      userId: user.id,
      action: active ? "ACTIVATE" : "DEACTIVATE",
      entity: "Equipment",
      entityId: equipment.id,
      details: equipment.name,
    });
    revalidatePath("/picagens/terminais");
  });
}

export async function deleteEquipment(equipmentId: string): Promise<ActionResult> {
  return safe(async () => {
    const user = await assertCanWrite();
    const entryCount = await prisma.timeClockEntry.count({ where: { equipmentId } });
    if (entryCount > 0) {
      throw new Error(
        `Não é possível eliminar: existem ${entryCount} picagem(ns) registada(s) através deste equipamento. Desative-o em vez de o eliminar.`
      );
    }
    const equipment = await prisma.equipment.delete({ where: { id: equipmentId } });
    await logAudit({
      userId: user.id,
      action: "DELETE",
      entity: "Equipment",
      entityId: equipmentId,
      details: equipment.name,
    });
    revalidatePath("/picagens/terminais");
  });
}
