"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { countDays } from "@/lib/business-days";

async function assertCanManage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "ausencias")) {
    throw new Error("Sem permissão para gerir ausências.");
  }
  return user;
}

async function getOrCreateBalance(employeeId: string, absenceTypeId: string, year: number) {
  const existing = await prisma.absenceBalance.findUnique({
    where: { employeeId_absenceTypeId_year: { employeeId, absenceTypeId, year } },
  });
  if (existing) return existing;

  const type = await prisma.absenceType.findUniqueOrThrow({ where: { id: absenceTypeId } });
  return prisma.absenceBalance.create({
    data: {
      employeeId,
      absenceTypeId,
      year,
      entitledDays: type.annualLimitDays ?? 0,
    },
  });
}

// AU-02/AU-04: submissão de pedido de ausência, com validação de saldo disponível.
export async function requestAbsence(formData: FormData) {
  const user = await requireUser();
  if (!user.employeeId) throw new Error("Sem ficha de colaborador associada.");

  const absenceTypeId = String(formData.get("absenceTypeId"));
  const startDate = new Date(String(formData.get("startDate")));
  const endDate = new Date(String(formData.get("endDate")));
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const documentName = String(formData.get("documentName") ?? "").trim() || null;

  if (endDate < startDate) throw new Error("Data de fim anterior à data de início.");

  const type = await prisma.absenceType.findUniqueOrThrow({ where: { id: absenceTypeId } });
  if (type.isVacation) {
    throw new Error("Férias têm um módulo próprio — use Férias no menu para marcar dias no calendário.");
  }
  if (type.requiresDocument && !documentName) {
    throw new Error(`O tipo de ausência "${type.name}" exige documento comprovativo.`);
  }

  const days = countDays(startDate, endDate, type.unitType);
  const year = startDate.getFullYear();

  if (type.affectsBalance) {
    const balance = await getOrCreateBalance(user.employeeId, absenceTypeId, year);
    const available = balance.entitledDays - balance.usedDays - balance.plannedDays;
    if (available < days) {
      throw new Error(
        `Saldo insuficiente: disponível ${available.toFixed(1)} dia(s), pedido ${days} dia(s).`
      );
    }
    await prisma.absenceBalance.update({
      where: { id: balance.id },
      data: { plannedDays: { increment: days } },
    });
  }

  const absence = await prisma.absence.create({
    data: {
      employeeId: user.employeeId,
      absenceTypeId,
      startDate,
      endDate,
      days,
      reason,
      documentName,
      requestedById: user.id,
      status: "PENDING",
    },
  });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "Absence",
    entityId: absence.id,
    details: `${type.name}: ${days} dia(s)`,
  });

  revalidatePath("/ausencias");
}

// AU-03/AU-05/AU-06: aprovação/rejeição, atualização de saldo e alerta de cobertura.
export async function decideAbsence(
  absenceId: string,
  decision: "APPROVED" | "REJECTED",
  formData: FormData
) {
  const user = await assertCanManage();
  const decisionNote = String(formData.get("decisionNote") ?? "").trim() || null;

  const absence = await prisma.absence.findUniqueOrThrow({
    where: { id: absenceId },
    include: { absenceType: true },
  });

  if (absence.status !== "PENDING") throw new Error("Este pedido já foi decidido.");

  if (absence.absenceType.affectsBalance) {
    const year = absence.startDate.getFullYear();
    const balance = await getOrCreateBalance(absence.employeeId, absence.absenceTypeId, year);
    if (decision === "APPROVED") {
      await prisma.absenceBalance.update({
        where: { id: balance.id },
        data: { plannedDays: { decrement: absence.days }, usedDays: { increment: absence.days } },
      });
    } else {
      await prisma.absenceBalance.update({
        where: { id: balance.id },
        data: { plannedDays: { decrement: absence.days } },
      });
    }
  }

  await prisma.absence.update({
    where: { id: absenceId },
    data: { status: decision, approvedById: user.id, decidedAt: new Date(), decisionNote },
  });

  await logAudit({
    userId: user.id,
    action: decision === "APPROVED" ? "APPROVE" : "REJECT",
    entity: "Absence",
    entityId: absenceId,
  });

  revalidatePath("/ausencias");
  revalidatePath("/horarios");
}

export async function cancelAbsence(absenceId: string) {
  const user = await requireUser();
  const absence = await prisma.absence.findUniqueOrThrow({
    where: { id: absenceId },
    include: { absenceType: true },
  });

  if (absence.employeeId !== user.employeeId && !canWrite(user.roles, "ausencias")) {
    throw new Error("Sem permissão.");
  }
  if (absence.status !== "PENDING") throw new Error("Apenas pedidos pendentes podem ser cancelados.");

  if (absence.absenceType.affectsBalance) {
    const year = absence.startDate.getFullYear();
    const balance = await getOrCreateBalance(absence.employeeId, absence.absenceTypeId, year);
    await prisma.absenceBalance.update({
      where: { id: balance.id },
      data: { plannedDays: { decrement: absence.days } },
    });
  }

  await prisma.absence.update({ where: { id: absenceId }, data: { status: "CANCELLED" } });
  await logAudit({ userId: user.id, action: "CANCEL", entity: "Absence", entityId: absenceId });
  revalidatePath("/ausencias");
}

// AU-01: configuração de tipos de ausência.
export async function createAbsenceType(formData: FormData) {
  const user = await assertCanManage();
  const name = String(formData.get("name") ?? "").trim();
  const requiresDocument = formData.get("requiresDocument") === "on";
  const unitType = String(formData.get("unitType") ?? "WORKING_DAYS");
  const annualLimitDaysRaw = String(formData.get("annualLimitDays") ?? "");
  const affectsBalance = formData.get("affectsBalance") === "on";
  const socialSecurityCode = String(formData.get("socialSecurityCode") ?? "").trim() || null;
  const salaryImpactPercentRaw = String(formData.get("salaryImpactPercent") ?? "100");
  const salaryImpactPercent = Math.min(100, Math.max(0, Number(salaryImpactPercentRaw) || 0));

  if (!name) throw new Error("Nome obrigatório.");

  const type = await prisma.absenceType.create({
    data: {
      name,
      paid: salaryImpactPercent > 0,
      requiresDocument,
      unitType,
      annualLimitDays: annualLimitDaysRaw ? Number(annualLimitDaysRaw) : null,
      affectsBalance,
      socialSecurityCode,
      salaryImpactPercent,
    },
  });

  await logAudit({ userId: user.id, action: "CREATE", entity: "AbsenceType", entityId: type.id, details: name });
  revalidatePath("/ausencias/tipos");
}

export async function updateAbsenceTypeCode(absenceTypeId: string, socialSecurityCode: string) {
  const user = await assertCanManage();
  const type = await prisma.absenceType.update({
    where: { id: absenceTypeId },
    data: { socialSecurityCode: socialSecurityCode.trim() || null },
  });
  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "AbsenceType",
    entityId: type.id,
    details: `Código Segurança Social: ${type.socialSecurityCode ?? "(removido)"}`,
  });
  revalidatePath("/ausencias/tipos");
}

// Carrega os tipos de ausência mais comuns previstos no Código do Trabalho,
// com os valores por omissão do próprio código (dias/limite, se são pagos
// pela entidade empregadora ou por subsídio da Segurança Social). Não
// preenche o código de Segurança Social — esse depende de cada entidade/
// convenção coletiva e deve ser confirmado com o contabilista antes de
// reportar à Segurança Social. Ignora nomes que já existam.
const COMMON_ABSENCE_TYPES = [
  {
    name: "Falta por Doença",
    unitType: "CALENDAR_DAYS",
    annualLimitDays: null,
    requiresDocument: true,
    salaryImpactPercent: 0,
    affectsBalance: false,
  },
  {
    name: "Falecimento de Cônjuge ou Parente no 1º Grau",
    unitType: "CALENDAR_DAYS",
    annualLimitDays: 20,
    requiresDocument: false,
    salaryImpactPercent: 100,
    affectsBalance: false,
  },
  {
    name: "Falecimento de Outro Parente ou Afim",
    unitType: "CALENDAR_DAYS",
    annualLimitDays: 2,
    requiresDocument: false,
    salaryImpactPercent: 100,
    affectsBalance: false,
  },
  {
    name: "Assistência a Filho Menor",
    unitType: "CALENDAR_DAYS",
    annualLimitDays: 15,
    requiresDocument: true,
    salaryImpactPercent: 0,
    affectsBalance: false,
  },
  {
    name: "Assistência a Cônjuge ou Familiar",
    unitType: "CALENDAR_DAYS",
    annualLimitDays: 15,
    requiresDocument: true,
    salaryImpactPercent: 0,
    affectsBalance: false,
  },
  {
    name: "Casamento",
    unitType: "CALENDAR_DAYS",
    annualLimitDays: 15,
    requiresDocument: true,
    salaryImpactPercent: 100,
    affectsBalance: false,
  },
  {
    name: "Doação de Sangue",
    unitType: "WORKING_DAYS",
    annualLimitDays: null,
    requiresDocument: true,
    salaryImpactPercent: 100,
    affectsBalance: false,
  },
  {
    name: "Consulta Pré-Natal",
    unitType: "WORKING_DAYS",
    annualLimitDays: null,
    requiresDocument: true,
    salaryImpactPercent: 100,
    affectsBalance: false,
  },
  {
    name: "Licença Parental Inicial",
    unitType: "CALENDAR_DAYS",
    annualLimitDays: 120,
    requiresDocument: true,
    salaryImpactPercent: 0,
    affectsBalance: false,
  },
  {
    name: "Falta Justificada (outros motivos)",
    unitType: "WORKING_DAYS",
    annualLimitDays: null,
    requiresDocument: false,
    salaryImpactPercent: 100,
    affectsBalance: false,
  },
  {
    name: "Falta Injustificada",
    unitType: "WORKING_DAYS",
    annualLimitDays: null,
    requiresDocument: false,
    salaryImpactPercent: 0,
    affectsBalance: false,
  },
] as const;

export async function loadCommonAbsenceTypes(): Promise<{ created: number; skipped: number }> {
  const user = await assertCanManage();

  const existing = await prisma.absenceType.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map((t) => t.name));
  const toCreate = COMMON_ABSENCE_TYPES.filter((t) => !existingNames.has(t.name));

  if (toCreate.length > 0) {
    await prisma.absenceType.createMany({
      data: toCreate.map((t) => ({
        name: t.name,
        unitType: t.unitType,
        annualLimitDays: t.annualLimitDays,
        requiresDocument: t.requiresDocument,
        salaryImpactPercent: t.salaryImpactPercent,
        paid: t.salaryImpactPercent > 0,
        affectsBalance: t.affectsBalance,
      })),
    });
    await logAudit({
      userId: user.id,
      action: "CREATE",
      entity: "AbsenceType",
      details: `Carregados ${toCreate.length} tipos comuns: ${toCreate.map((t) => t.name).join(", ")}`,
    });
  }

  revalidatePath("/ausencias/tipos");
  return { created: toCreate.length, skipped: COMMON_ABSENCE_TYPES.length - toCreate.length };
}
