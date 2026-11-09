"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "formacao")) {
    throw new Error("Sem permissão para gerir formação.");
  }
  return user;
}

function refresh(employeeIds: string[] = []) {
  revalidatePath("/formacao/formacoes");
  for (const employeeId of employeeIds) revalidatePath(`/colaboradores/${employeeId}/formacao`);
}

// --- Modalidades (tabela de configuração) ---------------------------------

export async function createTrainingModality(params: { name: string }): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    const name = params.name.trim();
    if (!name) return { error: "Nome obrigatório." };

    const existing = await prisma.trainingModality.findUnique({ where: { name } });
    if (existing) return { error: `Já existe uma modalidade "${name}".` };

    const modality = await prisma.trainingModality.create({ data: { name } });
    await logAudit({ userId: user.id, action: "CREATE", entity: "TrainingModality", entityId: modality.id, details: name });
    revalidatePath("/formacao/formacoes");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar modalidade." };
  }
}

export async function toggleTrainingModalityActive(modalityId: string): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    const current = await prisma.trainingModality.findUniqueOrThrow({ where: { id: modalityId } });
    await prisma.trainingModality.update({ where: { id: modalityId }, data: { active: !current.active } });
    await logAudit({
      userId: user.id,
      action: current.active ? "DEACTIVATE" : "ACTIVATE",
      entity: "TrainingModality",
      entityId: modalityId,
      details: current.name,
    });
    revalidatePath("/formacao/formacoes");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao atualizar modalidade." };
  }
}

// --- Entidades parceiras de formação ---------------------------------------

export async function createTrainingEntity(params: { name: string; nif: string }): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    const name = params.name.trim();
    const nif = params.nif.trim();
    if (!name) return { error: "Nome obrigatório." };
    if (!nif) return { error: "NIPC obrigatório." };

    const existing = await prisma.trainingEntity.findUnique({ where: { nif } });
    if (existing) return { error: `Já existe uma entidade com o NIPC ${nif}.` };

    const entity = await prisma.trainingEntity.create({ data: { name, nif } });
    await logAudit({ userId: user.id, action: "CREATE", entity: "TrainingEntity", entityId: entity.id, details: name });
    revalidatePath("/formacao/entidades");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar entidade." };
  }
}

export async function toggleTrainingEntityActive(entityId: string): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    const current = await prisma.trainingEntity.findUniqueOrThrow({ where: { id: entityId } });
    await prisma.trainingEntity.update({ where: { id: entityId }, data: { active: !current.active } });
    await logAudit({
      userId: user.id,
      action: current.active ? "DEACTIVATE" : "ACTIVATE",
      entity: "TrainingEntity",
      entityId,
      details: current.name,
    });
    revalidatePath("/formacao/entidades");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao atualizar entidade." };
  }
}

export async function createTrainingAddress(params: {
  entityId: string;
  address: string;
  postalCode?: string;
}): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    const address = params.address.trim();
    if (!address) return { error: "Morada obrigatória." };

    const created = await prisma.trainingAddress.create({
      data: {
        entityId: params.entityId,
        address,
        postalCode: params.postalCode?.trim() || null,
      },
    });
    await logAudit({ userId: user.id, action: "CREATE", entity: "TrainingAddress", entityId: created.id, details: address });
    revalidatePath("/formacao/entidades");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao adicionar morada." };
  }
}

export async function deleteTrainingAddress(addressId: string): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    await prisma.trainingAddress.delete({ where: { id: addressId } });
    await logAudit({ userId: user.id, action: "DELETE", entity: "TrainingAddress", entityId: addressId });
    revalidatePath("/formacao/entidades");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao eliminar morada." };
  }
}

// --- Formações ---------------------------------------------------------------

export type SessionInput = { date: string; hours: number; notes?: string };

export async function createTraining(params: {
  name: string;
  modalityId: string;
  entityId?: string;
  description?: string;
  sessions: SessionInput[];
}): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    const name = params.name.trim();
    if (!name) return { error: "Nome obrigatório." };
    if (!params.modalityId) return { error: "Selecione a modalidade." };
    const sessions = params.sessions.filter((s) => s.date && s.hours > 0);
    if (sessions.length === 0) return { error: "Adicione pelo menos uma sessão ao cronograma, com data e horas." };

    const training = await prisma.training.create({
      data: {
        name,
        modalityId: params.modalityId,
        entityId: params.entityId || null,
        description: params.description?.trim() || null,
        createdById: user.id,
        sessions: {
          create: sessions.map((s) => ({
            date: new Date(`${s.date}T00:00:00`),
            hours: s.hours,
            notes: s.notes?.trim() || null,
          })),
        },
      },
    });

    await logAudit({ userId: user.id, action: "CREATE", entity: "Training", entityId: training.id, details: name });
    revalidatePath("/formacao/formacoes");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar formação." };
  }
}

export async function deleteTraining(trainingId: string): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    const training = await prisma.training.findUniqueOrThrow({
      where: { id: trainingId },
      include: { enrollments: { select: { employeeId: true } } },
    });
    const employeeIds = training.enrollments.map((e) => e.employeeId);

    await prisma.training.delete({ where: { id: trainingId } });
    await logAudit({ userId: user.id, action: "DELETE", entity: "Training", entityId: trainingId, details: training.name });
    refresh(employeeIds);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao eliminar formação." };
  }
}

// Substitui a lista completa de colaboradores inscritos nesta formação —
// usado pela modal "Associar colaboradores" (seleção múltipla).
export async function setTrainingEnrollments(
  trainingId: string,
  employeeIds: string[]
): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();
    const current = await prisma.trainingEnrollment.findMany({
      where: { trainingId },
      select: { employeeId: true },
    });
    const currentIds = new Set(current.map((c) => c.employeeId));
    const nextIds = new Set(employeeIds);

    const toAdd = [...nextIds].filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !nextIds.has(id));

    await prisma.$transaction([
      ...(toAdd.length > 0
        ? [
            prisma.trainingEnrollment.createMany({
              data: toAdd.map((employeeId) => ({ trainingId, employeeId })),
            }),
          ]
        : []),
      ...(toRemove.length > 0
        ? [
            prisma.trainingEnrollment.deleteMany({
              where: { trainingId, employeeId: { in: toRemove } },
            }),
          ]
        : []),
    ]);

    await logAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "TrainingEnrollment",
      entityId: trainingId,
      details: `+${toAdd.length} / -${toRemove.length}`,
    });
    refresh([...toAdd, ...toRemove]);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao atualizar colaboradores inscritos." };
  }
}
