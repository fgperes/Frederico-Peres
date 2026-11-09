"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  scheduleWorkMedicineAppointment,
  rescheduleWorkMedicineAppointment,
  confirmWorkMedicineRealization,
  closeWorkMedicineAppointment,
} from "@/lib/work-medicine";

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "medicina_trabalho")) {
    throw new Error("Sem permissão para gerir medicina do trabalho.");
  }
  return user;
}

function refresh(employeeId?: string) {
  revalidatePath("/medicina-trabalho/agendamento");
  if (employeeId) revalidatePath(`/colaboradores/${employeeId}/medicina-trabalho`);
}

export async function createWorkMedicineEntity(params: {
  name: string;
  nif: string;
}): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    const name = params.name.trim();
    const nif = params.nif.trim();
    if (!name) return { error: "Nome obrigatório." };
    if (!nif) return { error: "NIPC obrigatório." };

    const existing = await prisma.workMedicineEntity.findUnique({ where: { nif } });
    if (existing) return { error: `Já existe uma entidade com o NIPC ${nif}.` };

    const entity = await prisma.workMedicineEntity.create({ data: { name, nif } });
    await logAudit({ userId: user.id, action: "CREATE", entity: "WorkMedicineEntity", entityId: entity.id, details: name });
    revalidatePath("/medicina-trabalho/entidades");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar entidade." };
  }
}

export async function toggleWorkMedicineEntityActive(entityId: string): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    const current = await prisma.workMedicineEntity.findUniqueOrThrow({ where: { id: entityId } });
    await prisma.workMedicineEntity.update({ where: { id: entityId }, data: { active: !current.active } });
    await logAudit({
      userId: user.id,
      action: current.active ? "DEACTIVATE" : "ACTIVATE",
      entity: "WorkMedicineEntity",
      entityId,
      details: current.name,
    });
    revalidatePath("/medicina-trabalho/entidades");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao atualizar entidade." };
  }
}

export async function createWorkMedicineAddress(params: {
  entityId: string;
  address: string;
  postalCode?: string;
}): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    const address = params.address.trim();
    if (!address) return { error: "Morada obrigatória." };

    const created = await prisma.workMedicineAddress.create({
      data: {
        entityId: params.entityId,
        address,
        postalCode: params.postalCode?.trim() || null,
      },
    });
    await logAudit({ userId: user.id, action: "CREATE", entity: "WorkMedicineAddress", entityId: created.id, details: address });
    revalidatePath("/medicina-trabalho/entidades");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao adicionar morada." };
  }
}

export async function deleteWorkMedicineAddress(addressId: string): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    const used = await prisma.workMedicineAppointment.findFirst({ where: { addressId }, select: { id: true } });
    if (used) return { error: "Esta morada já tem agendamentos associados e não pode ser eliminada." };
    await prisma.workMedicineAddress.delete({ where: { id: addressId } });
    await logAudit({ userId: user.id, action: "DELETE", entity: "WorkMedicineAddress", entityId: addressId });
    revalidatePath("/medicina-trabalho/entidades");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao eliminar morada." };
  }
}

export async function scheduleAppointmentAction(params: {
  employeeId: string;
  entityId: string;
  addressId: string;
  date: string;
  time: string;
}): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    if (!params.employeeId) return { error: "Selecione o colaborador." };
    if (!params.date || !params.time) return { error: "Indique a data e a hora." };

    const scheduledAt = new Date(`${params.date}T${params.time}:00`);
    if (Number.isNaN(scheduledAt.getTime())) return { error: "Data/hora inválida." };

    await scheduleWorkMedicineAppointment({
      employeeId: params.employeeId,
      entityId: params.entityId || null,
      addressId: params.addressId || null,
      scheduledAt,
      createdById: user.id,
    });
    refresh(params.employeeId);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao agendar." };
  }
}

export async function rescheduleAppointmentAction(params: {
  appointmentId: string;
  employeeId: string;
  entityId: string;
  addressId: string;
  date: string;
  time: string;
}): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    if (!params.date || !params.time) return { error: "Indique a data e a hora." };
    const scheduledAt = new Date(`${params.date}T${params.time}:00`);
    if (Number.isNaN(scheduledAt.getTime())) return { error: "Data/hora inválida." };

    await rescheduleWorkMedicineAppointment({
      appointmentId: params.appointmentId,
      scheduledAt,
      entityId: params.entityId || null,
      addressId: params.addressId || null,
      userId: user.id,
    });
    refresh(params.employeeId);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao reagendar." };
  }
}

export async function confirmRealizationAction(
  appointmentId: string,
  employeeId: string
): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    await confirmWorkMedicineRealization({ appointmentId, userId: user.id });
    refresh(employeeId);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao confirmar realização." };
  }
}

export async function closeAppointmentAction(params: {
  appointmentId: string;
  employeeId: string;
  resultStatus: "APTO" | "NAO_APTO";
  resultNotes: string;
  documentName?: string;
  documentType?: string;
  documentData?: string;
}): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    await closeWorkMedicineAppointment({
      appointmentId: params.appointmentId,
      userId: user.id,
      resultStatus: params.resultStatus,
      resultNotes: params.resultNotes || null,
      documentName: params.documentName || null,
      documentType: params.documentType || null,
      documentData: params.documentData || null,
    });
    refresh(params.employeeId);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao registar resultado." };
  }
}
