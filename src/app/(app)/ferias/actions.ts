"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canRead, canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  getOrCreateVacationBalance,
  getVacationType,
  computeFirstYearEntitlement,
  computeHeadcount,
  ensureVacationTask,
  resolveVacationTasksIfClear,
  isWeekday,
  CANCEL_REQUEST_MARKER,
  type VacationHistoryRow,
} from "@/lib/vacation";

function revalidateFerias(employeeId?: string) {
  revalidatePath("/ferias");
  revalidatePath("/ferias/equipa");
  revalidatePath("/ferias/aprovacoes");
  if (employeeId) revalidatePath(`/colaboradores/${employeeId}/ferias`);
  revalidatePath("/", "layout");
}

// Confirma que o utilizador atual pode marcar/desmarcar férias na ficha de
// `targetEmployeeId`: a própria ficha (self-service) ou, tendo perfil de
// gestão (canWrite em "ferias"), qualquer colaborador dentro do seu âmbito.
async function assertCanActOn(targetEmployeeId: string) {
  const user = await requireUser();
  if (!canRead(user.roles, "ferias")) throw new Error("Sem permissão para o módulo de férias.");

  if (user.employeeId === targetEmployeeId) {
    return { user, isSelf: true };
  }

  if (!canWrite(user.roles, "ferias")) {
    throw new Error("Sem permissão para gerir férias de outro colaborador.");
  }
  const scope = await employeeScopeWhere(user);
  const target = await prisma.employee.findFirst({ where: { AND: [{ id: targetEmployeeId }, scope] } });
  if (!target) throw new Error("Colaborador fora do seu âmbito de gestão.");

  return { user, isSelf: false };
}

// Marca/desmarca um único dia como férias. Comportamento depende de quem
// está a agir:
// - O próprio colaborador (self-service): novo pedido fica pendente de
//   aprovação; um dia já aprovado não é cancelado diretamente — fica
//   marcado como "pedido de cancelamento" até alguém com perfil de gestão
//   decidir.
// - Um perfil de gestão a marcar férias a outro colaborador: já tem
//   autoridade para aprovar, por isso o dia fica logo aprovado/cancelado,
//   sem passar por um novo ciclo de aprovação.
export async function toggleVacationDay(formData: FormData) {
  const dateStr = String(formData.get("date") ?? "");
  const targetEmployeeId = String(formData.get("employeeId") ?? "");
  if (!targetEmployeeId) throw new Error("Colaborador não identificado.");

  const { user, isSelf } = await assertCanActOn(targetEmployeeId);

  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Data inválida.");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) throw new Error("Não é possível alterar férias em datas passadas.");
  if (!isWeekday(date)) throw new Error("Só é possível marcar férias em dias úteis.");

  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: targetEmployeeId } });
  const employeeName = `${employee.firstName} ${employee.lastName}`;
  const { type, balance } = await getOrCreateVacationBalance(targetEmployeeId, date.getFullYear());

  const existing = await prisma.absence.findFirst({
    where: { employeeId: targetEmployeeId, absenceTypeId: type.id, startDate: date, endDate: date },
  });

  // Dia com um pedido novo pendente: qualquer um dos dois cancela o pedido.
  if (existing?.status === "PENDING") {
    await prisma.absence.delete({ where: { id: existing.id } });
    await prisma.absenceBalance.update({
      where: { id: balance.id },
      data: { plannedDays: { decrement: 1 } },
    });
    await logAudit({ userId: user.id, action: "CANCEL", entity: "Absence", entityId: existing.id, details: "Férias" });
    await resolveVacationTasksIfClear(targetEmployeeId);
    revalidateFerias();
    return;
  }

  // Dia já aprovado, com um pedido de cancelamento já em curso.
  if (existing?.status === "APPROVED" && existing.reason === CANCEL_REQUEST_MARKER) {
    if (isSelf) {
      // O colaborador retira o seu próprio pedido de cancelamento.
      await prisma.absence.update({ where: { id: existing.id }, data: { reason: null } });
      await logAudit({
        userId: user.id,
        action: "CANCEL",
        entity: "Absence",
        entityId: existing.id,
        details: "Retirou pedido de cancelamento de férias aprovadas",
      });
      await resolveVacationTasksIfClear(targetEmployeeId);
    } else {
      // Perfil de gestão confirma o cancelamento diretamente.
      await prisma.absence.update({
        where: { id: existing.id },
        data: { status: "CANCELLED", reason: null, approvedById: user.id, decidedAt: new Date() },
      });
      await prisma.absenceBalance.update({
        where: { id: balance.id },
        data: { usedDays: { decrement: 1 } },
      });
      await logAudit({
        userId: user.id,
        action: "CANCEL",
        entity: "Absence",
        entityId: existing.id,
        details: `Confirmou cancelamento de férias de ${employeeName}`,
      });
      await resolveVacationTasksIfClear(targetEmployeeId);
    }
    revalidateFerias();
    return;
  }

  // Dia já aprovado, sem pedido de cancelamento em curso.
  if (existing?.status === "APPROVED") {
    if (isSelf) {
      // Fica a aguardar confirmação — não cancela de imediato.
      await prisma.absence.update({ where: { id: existing.id }, data: { reason: CANCEL_REQUEST_MARKER } });
      await logAudit({
        userId: user.id,
        action: "CREATE",
        entity: "Absence",
        entityId: existing.id,
        details: "Pediu cancelamento de férias aprovadas",
      });
      await ensureVacationTask(targetEmployeeId, employeeName, "CANCELLATION");
    } else {
      // Perfil de gestão cancela diretamente.
      await prisma.absence.update({
        where: { id: existing.id },
        data: { status: "CANCELLED", approvedById: user.id, decidedAt: new Date() },
      });
      await prisma.absenceBalance.update({
        where: { id: balance.id },
        data: { usedDays: { decrement: 1 } },
      });
      await logAudit({
        userId: user.id,
        action: "CANCEL",
        entity: "Absence",
        entityId: existing.id,
        details: `Cancelou férias de ${employeeName}`,
      });
    }
    revalidateFerias();
    return;
  }

  // Não existe pedido, ou existia mas foi rejeitado/cancelado — cria um novo.
  const available = balance.entitledDays + balance.carryOverDays - balance.usedDays - balance.plannedDays;
  if (available < 1) throw new Error("Sem dias de férias disponíveis para marcar.");

  if (existing) {
    await prisma.absence.delete({ where: { id: existing.id } });
  }

  if (isSelf) {
    const absence = await prisma.absence.create({
      data: {
        employeeId: targetEmployeeId,
        absenceTypeId: type.id,
        startDate: date,
        endDate: date,
        days: 1,
        status: "PENDING",
        requestedById: user.id,
      },
    });
    await prisma.absenceBalance.update({
      where: { id: balance.id },
      data: { plannedDays: { increment: 1 } },
    });
    await logAudit({ userId: user.id, action: "CREATE", entity: "Absence", entityId: absence.id, details: "Férias" });
    await ensureVacationTask(targetEmployeeId, employeeName, "REQUEST");
  } else {
    // Perfil de gestão marca diretamente como aprovado.
    const absence = await prisma.absence.create({
      data: {
        employeeId: targetEmployeeId,
        absenceTypeId: type.id,
        startDate: date,
        endDate: date,
        days: 1,
        status: "APPROVED",
        requestedById: user.id,
        approvedById: user.id,
        decidedAt: new Date(),
      },
    });
    await prisma.absenceBalance.update({
      where: { id: balance.id },
      data: { usedDays: { increment: 1 } },
    });
    await logAudit({
      userId: user.id,
      action: "CREATE",
      entity: "Absence",
      entityId: absence.id,
      details: `Marcou férias aprovadas para ${employeeName}`,
    });
  }

  revalidateFerias();
}

// Aprova/rejeita em bloco um período (dias consecutivos do mesmo colaborador
// e do mesmo tipo): pode ser um pedido novo (status PENDING) ou um pedido de
// cancelamento de férias já aprovadas (status APPROVED + marcador).
export async function decideVacationPeriod(
  absenceIds: string[],
  decision: "APPROVED" | "REJECTED",
  formData: FormData
) {
  const user = await requireUser();
  if (!canWrite(user.roles, "ferias")) throw new Error("Sem permissão para aprovar férias.");

  const decisionNote = String(formData.get("decisionNote") ?? "").trim() || null;

  const absences = await prisma.absence.findMany({ where: { id: { in: absenceIds } } });
  if (absences.length === 0) throw new Error("Período não encontrado.");

  const requestRows = absences.filter((a) => a.status === "PENDING");
  const cancelRows = absences.filter((a) => a.status === "APPROVED" && a.reason === CANCEL_REQUEST_MARKER);

  if (requestRows.length > 0) {
    const employeeId = requestRows[0].employeeId;
    const byYear = new Map<number, number>();
    for (const a of requestRows) {
      const year = a.startDate.getFullYear();
      byYear.set(year, (byYear.get(year) ?? 0) + 1);
    }
    for (const [year, count] of byYear) {
      const { balance } = await getOrCreateVacationBalance(employeeId, year);
      if (decision === "APPROVED") {
        await prisma.absenceBalance.update({
          where: { id: balance.id },
          data: { plannedDays: { decrement: count }, usedDays: { increment: count } },
        });
      } else {
        await prisma.absenceBalance.update({
          where: { id: balance.id },
          data: { plannedDays: { decrement: count } },
        });
      }
    }
    await prisma.absence.updateMany({
      where: { id: { in: requestRows.map((a) => a.id) } },
      data: { status: decision, approvedById: user.id, decidedAt: new Date(), decisionNote },
    });
    await logAudit({
      userId: user.id,
      action: decision === "APPROVED" ? "APPROVE" : "REJECT",
      entity: "Absence",
      details: `Férias (${requestRows.length} dia(s))`,
    });
    await resolveVacationTasksIfClear(employeeId);
    revalidateFerias();
    return;
  }

  if (cancelRows.length > 0) {
    const employeeId = cancelRows[0].employeeId;
    if (decision === "APPROVED") {
      const byYear = new Map<number, number>();
      for (const a of cancelRows) {
        const year = a.startDate.getFullYear();
        byYear.set(year, (byYear.get(year) ?? 0) + 1);
      }
      for (const [year, count] of byYear) {
        const { balance } = await getOrCreateVacationBalance(employeeId, year);
        await prisma.absenceBalance.update({
          where: { id: balance.id },
          data: { usedDays: { decrement: count } },
        });
      }
      await prisma.absence.updateMany({
        where: { id: { in: cancelRows.map((a) => a.id) } },
        data: { status: "CANCELLED", reason: null, approvedById: user.id, decidedAt: new Date(), decisionNote },
      });
      await logAudit({
        userId: user.id,
        action: "CANCEL",
        entity: "Absence",
        details: `Confirmou cancelamento de férias (${cancelRows.length} dia(s))`,
      });
    } else {
      // Rejeita o pedido de cancelamento — as férias mantêm-se aprovadas.
      await prisma.absence.updateMany({
        where: { id: { in: cancelRows.map((a) => a.id) } },
        data: { reason: null },
      });
      await logAudit({
        userId: user.id,
        action: "REJECT",
        entity: "Absence",
        details: `Rejeitou pedido de cancelamento de férias (${cancelRows.length} dia(s))`,
      });
    }
    await resolveVacationTasksIfClear(employeeId);
    revalidateFerias();
    return;
  }

  throw new Error("Este período já foi decidido.");
}

// RH edita o saldo (entitlement/transição do ano anterior) de um colaborador.
export async function updateVacationBalance(employeeId: string, year: number, formData: FormData) {
  const user = await requireUser();
  if (!canWrite(user.roles, "ferias")) throw new Error("Sem permissão para editar saldos de férias.");

  const entitledDays = Number(formData.get("entitledDays") ?? 22);
  const carryOverDays = Number(formData.get("carryOverDays") ?? 0);
  if (!Number.isFinite(entitledDays) || entitledDays < 0) throw new Error("Dias de férias do ano inválidos.");
  if (!Number.isFinite(carryOverDays) || carryOverDays < 0) throw new Error("Dias transitados inválidos.");

  const { balance } = await getOrCreateVacationBalance(employeeId, year);
  await prisma.absenceBalance.update({
    where: { id: balance.id },
    data: { entitledDays, carryOverDays },
  });

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "AbsenceBalance",
    entityId: balance.id,
    details: `Férias ${year}: ${entitledDays} dia(s) + ${carryOverDays} transitado(s)`,
  });

  revalidateFerias();
}

// Recalcula, para todos os colaboradores com data de admissão preenchida, o
// direito a férias do ano de admissão (2 dias por mês completo, com o teto
// legal de 20 dias) — corrige saldos criados antes desta regra existir, sem
// tocar em dias já marcados/aprovados nem na transição de anos anteriores.
export async function recalculateHireYearEntitlements(): Promise<{ updated: number; skipped: number }> {
  const user = await requireUser();
  if (!canWrite(user.roles, "ferias")) throw new Error("Sem permissão para recalcular saldos de férias.");

  const type = await getVacationType();
  const employees = await prisma.employee.findMany({
    where: { hireDate: { not: null } },
    select: { id: true, hireDate: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const employee of employees) {
    const hireDate = employee.hireDate!;
    const hireYear = hireDate.getFullYear();
    const balance = await prisma.absenceBalance.findUnique({
      where: { employeeId_absenceTypeId_year: { employeeId: employee.id, absenceTypeId: type.id, year: hireYear } },
    });
    if (!balance) {
      skipped++;
      continue;
    }
    const entitledDays = computeFirstYearEntitlement(hireDate);
    if (balance.entitledDays === entitledDays) {
      skipped++;
      continue;
    }
    await prisma.absenceBalance.update({ where: { id: balance.id }, data: { entitledDays } });
    updated++;
  }

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "AbsenceBalance",
    details: `Recalculou saldos do ano de admissão: ${updated} atualizado(s), ${skipped} sem alteração`,
  });

  revalidateFerias();
  return { updated, skipped };
}

// Cria explicitamente o contingente de férias de um colaborador para um
// dado ano (por defeito só é criado de forma implícita ao navegar para esse
// ano em Férias/Equipa) — usado no botão "Criar contingente do ano
// seguinte" na ficha do colaborador. O direito é calculado com a mesma
// regra de sempre (pro-rata no ano de admissão, senão o valor por defeito).
export async function createVacationBalanceForYear(
  employeeId: string,
  year: number
): Promise<VacationHistoryRow> {
  const user = await requireUser();
  if (!canWrite(user.roles, "ferias")) throw new Error("Sem permissão para criar contingentes de férias.");

  const scope = await employeeScopeWhere(user);
  const employee = await prisma.employee.findFirst({ where: { AND: [{ id: employeeId }, scope] } });
  if (!employee) throw new Error("Colaborador fora do seu âmbito de gestão.");

  const { balance } = await getOrCreateVacationBalance(employeeId, year);
  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "AbsenceBalance",
    entityId: balance.id,
    details: `Criou contingente de férias de ${employee.firstName} ${employee.lastName} para ${year}`,
  });

  revalidateFerias(employeeId);
  return { year, ...computeHeadcount(balance) };
}
