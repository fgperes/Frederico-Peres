"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "contratos")) {
    throw new Error("Sem permissão para editar contratos.");
  }
  return user;
}

// CT-01/CT-05: registar dados contratuais e sincronizar horas/vínculo com a
// ficha do colaborador, para condicionar a geração de horários.
export async function createContract(formData: FormData) {
  const user = await assertCanWrite();

  const employeeId = String(formData.get("employeeId"));
  const contractType = String(formData.get("contractType"));
  const startDate = new Date(String(formData.get("startDate")));
  const endDateRaw = String(formData.get("endDate") ?? "");
  const trialPeriodEndDateRaw = String(formData.get("trialPeriodEndDate") ?? "");
  const weeklyHours = Number(formData.get("weeklyHours") ?? 40);
  const weeklyRestDays = Number(formData.get("weeklyRestDays") ?? 1);
  const baseSalaryRaw = String(formData.get("baseSalary") ?? "");
  const documentName = String(formData.get("documentName") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const parentContractId = String(formData.get("parentContractId") ?? "") || null;

  let version = 1;
  if (parentContractId) {
    const parent = await prisma.contract.findUniqueOrThrow({ where: { id: parentContractId } });
    version = parent.version + 1;
  }

  const contract = await prisma.contract.create({
    data: {
      employeeId,
      contractType,
      startDate,
      endDate: endDateRaw ? new Date(endDateRaw) : null,
      trialPeriodEndDate: trialPeriodEndDateRaw ? new Date(trialPeriodEndDateRaw) : null,
      weeklyHours,
      weeklyRestDays,
      baseSalary: baseSalaryRaw ? Number(baseSalaryRaw) : null,
      documentName,
      notes,
      parentContractId,
      version,
      status: "ACTIVE",
    },
  });

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      weeklyHours,
      employmentType: contractType === "PART_TIME" ? "PART_TIME" : "FULL_TIME",
    },
  });

  await logAudit({
    userId: user.id,
    action: parentContractId ? "AMEND" : "CREATE",
    entity: "Contract",
    entityId: contract.id,
    details: `${contractType} — ${weeklyHours}h/semana`,
  });

  revalidatePath("/contratos");
  revalidatePath(`/colaboradores/${employeeId}`);
  redirect(`/contratos/${contract.id}`);
}

export async function setContractStatus(contractId: string, status: "ACTIVE" | "EXPIRED" | "TERMINATED") {
  const user = await assertCanWrite();
  const contract = await prisma.contract.update({ where: { id: contractId }, data: { status } });
  await logAudit({ userId: user.id, action: "UPDATE_STATUS", entity: "Contract", entityId: contract.id, details: status });
  revalidatePath("/contratos");
  revalidatePath(`/contratos/${contractId}`);
}

// Tipos de contrato configuráveis (tal como os tipos de ausência).
export async function createContractType(formData: FormData) {
  const user = await assertCanWrite();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Nome obrigatório.");

  const key = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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

  const inUse = await prisma.contract.count({ where: { contractType: type.key } });
  if (inUse > 0) throw new Error(`Este tipo está em uso em ${inUse} contrato(s) e não pode ser removido.`);

  await prisma.contractTypeDefinition.delete({ where: { id: contractTypeId } });
  await logAudit({ userId: user.id, action: "DELETE", entity: "ContractTypeDefinition", entityId: contractTypeId, details: type.label });
  revalidatePath("/contratos/tipos");
  revalidatePath("/contratos/novo");
}
