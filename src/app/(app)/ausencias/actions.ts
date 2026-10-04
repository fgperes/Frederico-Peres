"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canRead, canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { countDays } from "@/lib/business-days";
import { shiftDurationHours } from "@/lib/schedule";
import { isoDate, eachDayBetween } from "@/lib/dates";

async function assertCanManage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "ausencias")) {
    throw new Error("Sem permissão para gerir ausências.");
  }
  return user;
}

// Confirma que o utilizador atual pode pedir/gerir ausências na ficha de
// `targetEmployeeId`: a própria ficha (self-service) ou, tendo perfil de
// gestão (canWrite em "ausencias"), qualquer colaborador dentro do seu
// âmbito — mesma regra do módulo de Férias.
async function assertCanActOn(targetEmployeeId: string) {
  const user = await requireUser();
  if (!canRead(user.roles, "ausencias")) throw new Error("Sem permissão para o módulo de ausências.");

  if (user.employeeId === targetEmployeeId) {
    return { user, isSelf: true };
  }

  if (!canWrite(user.roles, "ausencias")) {
    throw new Error("Sem permissão para gerir ausências de outro colaborador.");
  }
  const scope = await employeeScopeWhere(user);
  const target = await prisma.employee.findFirst({ where: { AND: [{ id: targetEmployeeId }, scope] } });
  if (!target) throw new Error("Colaborador fora do seu âmbito de gestão.");

  return { user, isSelf: false };
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

export type RequestAbsenceState = { error?: string };

// AU-02/AU-04: submissão de um pedido de ausência — mesmo processo de
// marcação de Férias (escolher o tipo, clicar os dias num calendário
// mensal e guardar tudo junto), com as diferenças de exigir a escolha do
// tipo de ausência e permitir anexar um comprovativo real. Os dias
// escolhidos têm de formar um período contínuo (sem falhas) segundo a
// unidade do tipo — dias úteis ou corridos.
export async function requestAbsenceDays(
  targetEmployeeId: string,
  absenceTypeId: string,
  dates: string[],
  details: { reason?: string; documentName?: string; documentData?: string }
): Promise<RequestAbsenceState> {
  try {
    const { user } = await assertCanActOn(targetEmployeeId);

    if (dates.length === 0) return { error: "Selecione pelo menos um dia." };

    const type = await prisma.absenceType.findUniqueOrThrow({ where: { id: absenceTypeId } });
    if (type.isVacation) {
      throw new Error("Férias têm um módulo próprio — use Férias no menu para marcar dias no calendário.");
    }
    if (type.requiresDocument && !details.documentData) {
      throw new Error(`O tipo de ausência "${type.name}" exige documento comprovativo.`);
    }

    const sorted = Array.from(new Set(dates)).sort();
    const startDate = new Date(`${sorted[0]}T00:00:00`);
    const endDate = new Date(`${sorted[sorted.length - 1]}T00:00:00`);

    const expectedDays = countDays(startDate, endDate, type.unitType);
    if (sorted.length !== expectedDays) {
      throw new Error("Os dias selecionados têm de formar um período contínuo, sem falhas.");
    }

    const overlapping = await prisma.absence.findFirst({
      where: {
        employeeId: targetEmployeeId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlapping) {
      throw new Error("Já existe um pedido de ausência que se sobrepõe a estas datas.");
    }

    const days = sorted.length;
    const year = startDate.getFullYear();

    if (type.affectsBalance) {
      const balance = await getOrCreateBalance(targetEmployeeId, absenceTypeId, year);
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
        employeeId: targetEmployeeId,
        absenceTypeId,
        startDate,
        endDate,
        days,
        reason: details.reason?.trim() || null,
        documentName: details.documentName?.trim() || null,
        documentData: details.documentData || null,
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
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível submeter o pedido." };
  }
}

// AU-03/AU-05/AU-06: aprovação/rejeição, atualização de saldo e alerta de cobertura.
export async function decideAbsence(
  absenceId: string,
  decision: "APPROVED" | "REJECTED",
  formData: FormData
): Promise<{ error?: string }> {
  try {
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

    // Tipos marcados para descontar da bolsa de horas (ex.: "Compensação de
    // horas") criam, ao aprovar, um débito por dia coberto — as horas que
    // estavam previstas em escala nesse dia (ou, sem turno, a média diária
    // do horário contratual).
    if (decision === "APPROVED" && absence.absenceType.countsAgainstHourPool) {
      const employee = await prisma.employee.findUniqueOrThrow({
        where: { id: absence.employeeId },
        select: { weeklyHours: true },
      });
      const days = eachDayBetween(absence.startDate, absence.endDate);
      const dayEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const shifts = await prisma.shift.findMany({
        where: {
          employeeId: absence.employeeId,
          date: { gte: absence.startDate, lte: dayEnd(absence.endDate) },
          status: "PUBLISHED",
        },
        include: { shiftTemplate: true },
      });
      const shiftByDay = new Map(shifts.map((s) => [isoDate(s.date), s]));

      await prisma.hourPoolMovement.createMany({
        data: days.map((day) => {
          const shift = shiftByDay.get(isoDate(day));
          const hours = shift
            ? shiftDurationHours(shift.startTime, shift.endTime, shift.shiftTemplate?.breakMins ?? 0)
            : employee.weeklyHours / 5;
          return {
            employeeId: absence.employeeId,
            date: day,
            minutes: -Math.round(hours * 60),
            source: "ABSENCE",
            reason: absence.absenceType.name,
            absenceId: absence.id,
            createdById: user.id,
          };
        }),
      });
    }

    await logAudit({
      userId: user.id,
      action: decision === "APPROVED" ? "APPROVE" : "REJECT",
      entity: "Absence",
      entityId: absenceId,
    });

    revalidatePath("/ausencias");
    revalidatePath("/horarios");
    revalidatePath(`/colaboradores/${absence.employeeId}/bolsa-horas`);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível decidir o pedido." };
  }
}

export async function cancelAbsence(absenceId: string): Promise<{ error?: string }> {
  try {
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
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível cancelar o pedido." };
  }
}

export type AbsenceTypeState = { error?: string };

function parseAbsenceTypeFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const requiresDocument = String(formData.get("requiresDocument") ?? "false") === "true";
  const unitType = String(formData.get("unitType") ?? "WORKING_DAYS");
  const annualLimitDaysRaw = String(formData.get("annualLimitDays") ?? "");
  const affectsBalance = formData.get("affectsBalance") === "on";
  const countsAgainstHourPool = formData.get("countsAgainstHourPool") === "on";
  const socialSecurityCode = String(formData.get("socialSecurityCode") ?? "").trim() || null;
  const salaryImpactPercentRaw = String(formData.get("salaryImpactPercent") ?? "100");
  const salaryImpactPercent = Math.min(100, Math.max(0, Number(salaryImpactPercentRaw) || 0));

  if (!name) throw new Error("Nome obrigatório.");

  return {
    name,
    paid: salaryImpactPercent > 0,
    requiresDocument,
    unitType,
    annualLimitDays: annualLimitDaysRaw ? Number(annualLimitDaysRaw) : null,
    affectsBalance,
    countsAgainstHourPool,
    socialSecurityCode,
    salaryImpactPercent,
  };
}

// AU-01: configuração de tipos de ausência.
export async function createAbsenceType(
  _prev: AbsenceTypeState,
  formData: FormData
): Promise<AbsenceTypeState> {
  try {
    const user = await assertCanManage();
    const data = parseAbsenceTypeFields(formData);

    const type = await prisma.absenceType.create({ data });

    await logAudit({ userId: user.id, action: "CREATE", entity: "AbsenceType", entityId: type.id, details: data.name });
    revalidatePath("/ausencias/tipos");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar o tipo de ausência." };
  }
}

// Edição completa de um tipo de ausência já existente — usada pela mesma
// modal de criação, aberta a partir de uma linha da tabela.
export async function updateAbsenceType(
  absenceTypeId: string,
  _prev: AbsenceTypeState,
  formData: FormData
): Promise<AbsenceTypeState> {
  try {
    const user = await assertCanManage();
    const data = parseAbsenceTypeFields(formData);

    await prisma.absenceType.update({ where: { id: absenceTypeId }, data });

    await logAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "AbsenceType",
      entityId: absenceTypeId,
      details: data.name,
    });
    revalidatePath("/ausencias/tipos");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível atualizar o tipo de ausência." };
  }
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
