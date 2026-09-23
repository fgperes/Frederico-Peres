"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugifyContractTypeKey } from "@/lib/contract-types";

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "contratos")) {
    throw new Error("Sem permissão para editar contratos.");
  }
  return user;
}

// Perfis de contrato são partilhados e, depois de criados, imutáveis nos
// termos (tipo, horas, folgas semanais) — só o nome e o estado
// ativo/inativo podem mudar. As condições que um colaborador teve em cada
// período ficam sempre fiéis ao histórico (EmployeeContract), mesmo que o
// perfil seja renomeado mais tarde.
export async function createContractProfile(formData: FormData) {
  const user = await assertCanWrite();

  let contractType = String(formData.get("contractType"));

  // "+ Novo tipo de contrato…" no próprio formulário — evita depender da
  // página separada de Tipos de Contrato para o caso comum.
  if (contractType === "__new__") {
    const label = String(formData.get("newContractTypeLabel") ?? "").trim();
    if (!label) throw new Error("Indique o nome do novo tipo de contrato.");
    const key = slugifyContractTypeKey(label);
    if (!key) throw new Error("Nome de tipo de contrato inválido.");

    const existingType = await prisma.contractTypeDefinition.findUnique({ where: { key } });
    if (existingType) {
      contractType = existingType.key;
    } else {
      const createdType = await prisma.contractTypeDefinition.create({
        data: { key, label, isSystem: false },
      });
      contractType = createdType.key;
      await logAudit({
        userId: user.id,
        action: "CREATE",
        entity: "ContractTypeDefinition",
        entityId: createdType.id,
        details: label,
      });
    }
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Indique o nome do contrato.");
  const weeklyHours = Number(formData.get("weeklyHours") ?? 40);
  const weeklyRestDays = Number(formData.get("weeklyRestDays") ?? 1);

  const existing = await prisma.contractProfile.findUnique({ where: { name } });
  if (existing) throw new Error("Já existe um contrato com este nome.");

  const profile = await prisma.contractProfile.create({
    data: { name, contractType, weeklyHours, weeklyRestDays },
  });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "ContractProfile",
    entityId: profile.id,
    details: `${name} — ${contractType} — ${weeklyHours}h/semana`,
  });

  revalidatePath("/contratos");
  redirect(`/contratos/${profile.id}`);
}

export async function renameContractProfile(profileId: string, formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Indique o nome do contrato.");

  const existing = await prisma.contractProfile.findUnique({ where: { name } });
  if (existing && existing.id !== profileId) throw new Error("Já existe um contrato com este nome.");

  const profile = await prisma.contractProfile.update({ where: { id: profileId }, data: { name } });
  await logAudit({ userId: user.id, action: "RENAME", entity: "ContractProfile", entityId: profile.id, details: name });
  revalidatePath("/contratos");
  revalidatePath(`/contratos/${profileId}`);
}

// Só é possível inativar um contrato se não tiver nenhum colaborador
// atualmente atribuído — garante que ninguém fica sem contrato ativo só
// porque o perfil foi inativado por baixo.
export async function setContractProfileActive(profileId: string, active: boolean) {
  const user = await assertCanWrite();

  if (!active) {
    const activeAssignments = await prisma.employeeContract.count({
      where: { contractProfileId: profileId, status: "ACTIVE" },
    });
    if (activeAssignments > 0) {
      throw new Error(
        `Este contrato tem ${activeAssignments} colaborador(es) atribuído(s) e não pode ser inativado.`
      );
    }
  }

  const profile = await prisma.contractProfile.update({ where: { id: profileId }, data: { active } });
  await logAudit({
    userId: user.id,
    action: active ? "ACTIVATE" : "DEACTIVATE",
    entity: "ContractProfile",
    entityId: profile.id,
    details: profile.name,
  });
  revalidatePath("/contratos");
  revalidatePath(`/contratos/${profileId}`);
}

// Atribui um colaborador a um perfil de contrato — encerra automaticamente
// a atribuição ativa anterior desse colaborador (se existir), preservando-a
// no histórico. Cada atribuição fica registada para sempre; nunca é
// editada, só encerrada.
export async function assignEmployeeContract(formData: FormData) {
  const user = await assertCanWrite();

  const employeeId = String(formData.get("employeeId"));
  const contractProfileId = String(formData.get("contractProfileId"));
  const startDateRaw = String(formData.get("startDate") ?? "");
  const trialPeriodEndDateRaw = String(formData.get("trialPeriodEndDate") ?? "");
  const baseSalaryRaw = String(formData.get("baseSalary") ?? "");
  const documentName = String(formData.get("documentName") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!employeeId || !contractProfileId || !startDateRaw) {
    throw new Error("Selecione o colaborador, o contrato e a data de início.");
  }
  const startDate = new Date(startDateRaw);

  const profile = await prisma.contractProfile.findUniqueOrThrow({ where: { id: contractProfileId } });
  if (!profile.active) throw new Error("Este contrato está inativo e não pode ser atribuído.");

  const previousActive = await prisma.employeeContract.findFirst({
    where: { employeeId, status: "ACTIVE" },
  });
  if (previousActive) {
    await prisma.employeeContract.update({
      where: { id: previousActive.id },
      data: { status: "ENDED", endDate: previousActive.endDate ?? startDate },
    });
  }

  const assignment = await prisma.employeeContract.create({
    data: {
      employeeId,
      contractProfileId,
      startDate,
      trialPeriodEndDate: trialPeriodEndDateRaw ? new Date(trialPeriodEndDateRaw) : null,
      baseSalary: baseSalaryRaw ? Number(baseSalaryRaw) : null,
      documentName,
      notes,
      status: "ACTIVE",
    },
  });

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      weeklyHours: profile.weeklyHours,
      employmentType: profile.contractType === "PART_TIME" ? "PART_TIME" : "FULL_TIME",
    },
  });

  await logAudit({
    userId: user.id,
    action: "ASSIGN",
    entity: "EmployeeContract",
    entityId: assignment.id,
    details: `${profile.name} → colaborador ${employeeId}`,
  });

  revalidatePath("/contratos");
  revalidatePath(`/contratos/${contractProfileId}`);
  revalidatePath(`/colaboradores/${employeeId}`);
  redirect(`/colaboradores/${employeeId}/contratos`);
}

// Rescindir — encerra a atribuição atual sem apagar o histórico; o
// colaborador mantém o registo desta atribuição para sempre.
export async function endEmployeeContract(assignmentId: string) {
  const user = await assertCanWrite();
  const assignment = await prisma.employeeContract.update({
    where: { id: assignmentId },
    data: { status: "ENDED", endDate: new Date() },
  });
  await logAudit({ userId: user.id, action: "END", entity: "EmployeeContract", entityId: assignment.id });
  revalidatePath("/contratos");
  revalidatePath(`/contratos/${assignment.contractProfileId}`);
  revalidatePath(`/colaboradores/${assignment.employeeId}`);
}

// Tipos de contrato configuráveis (tal como os tipos de ausência).
export async function createContractType(formData: FormData) {
  const user = await assertCanWrite();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Nome obrigatório.");

  const key = slugifyContractTypeKey(label);
  if (!key) throw new Error("Nome inválido.");

  const existing = await prisma.contractTypeDefinition.findUnique({ where: { key } });
  if (existing) throw new Error("Já existe um tipo de contrato com este nome.");

  const type = await prisma.contractTypeDefinition.create({ data: { key, label, isSystem: false } });
  await logAudit({ userId: user.id, action: "CREATE", entity: "ContractTypeDefinition", entityId: type.id, details: label });
  revalidatePath("/contratos/tipos");
  revalidatePath("/contratos/novo");
}

export async function deleteContractType(contractTypeId: string) {
  const user = await assertCanWrite();
  const type = await prisma.contractTypeDefinition.findUniqueOrThrow({ where: { id: contractTypeId } });
  if (type.isSystem) throw new Error("Este tipo de contrato é um tipo base do sistema e não pode ser removido.");

  const inUse = await prisma.contractProfile.count({ where: { contractType: type.key } });
  if (inUse > 0) throw new Error(`Este tipo está em uso em ${inUse} contrato(s) e não pode ser removido.`);

  await prisma.contractTypeDefinition.delete({ where: { id: contractTypeId } });
  await logAudit({ userId: user.id, action: "DELETE", entity: "ContractTypeDefinition", entityId: contractTypeId, details: type.label });
  revalidatePath("/contratos/tipos");
  revalidatePath("/contratos/novo");
}
