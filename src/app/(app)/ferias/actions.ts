"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canRead, canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  getOrCreateVacationBalance,
  ensureVacationTask,
  resolveVacationTasksIfClear,
  isWeekday,
} from "@/lib/vacation";

function revalidateFerias() {
  revalidatePath("/ferias");
  revalidatePath("/ferias/equipa");
  revalidatePath("/ferias/aprovacoes");
  revalidatePath("/", "layout");
}

// Marca/desmarca um único dia como férias na ficha do próprio colaborador
// (clique no calendário). Repetir o clique alterna: sem pedido -> pendente
// -> (novo clique) remove; se já aprovado, cancela (liberta o saldo).
export async function toggleVacationDay(formData: FormData) {
  const user = await requireUser();
  if (!user.employeeId) throw new Error("Sem ficha de colaborador associada.");
  if (!canRead(user.roles, "ferias")) throw new Error("Sem permissão para o módulo de férias.");

  const dateStr = String(formData.get("date") ?? "");
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Data inválida.");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) throw new Error("Não é possível alterar férias em datas passadas.");
  if (!isWeekday(date)) throw new Error("Só é possível marcar férias em dias úteis.");

  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: user.employeeId } });
  const employeeName = `${employee.firstName} ${employee.lastName}`;
  const { type, balance } = await getOrCreateVacationBalance(user.employeeId, date.getFullYear());

  const existing = await prisma.absence.findFirst({
    where: { employeeId: user.employeeId, absenceTypeId: type.id, startDate: date, endDate: date },
  });

  if (existing?.status === "PENDING") {
    await prisma.absence.delete({ where: { id: existing.id } });
    await prisma.absenceBalance.update({
      where: { id: balance.id },
      data: { plannedDays: { decrement: 1 } },
    });
    await logAudit({ userId: user.id, action: "CANCEL", entity: "Absence", entityId: existing.id, details: "Férias" });
    await resolveVacationTasksIfClear(user.employeeId);
    revalidateFerias();
    return;
  }

  if (existing?.status === "APPROVED") {
    await prisma.absence.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
    await prisma.absenceBalance.update({
      where: { id: balance.id },
      data: { usedDays: { decrement: 1 } },
    });
    await logAudit({
      userId: user.id,
      action: "CANCEL",
      entity: "Absence",
      entityId: existing.id,
      details: "Férias já aprovadas",
    });
    revalidateFerias();
    return;
  }

  // Não existe pedido, ou existia mas foi rejeitado/cancelado — permite pedir de novo.
  const available = balance.entitledDays + balance.carryOverDays - balance.usedDays - balance.plannedDays;
  if (available < 1) throw new Error("Sem dias de férias disponíveis para marcar.");

  if (existing) {
    await prisma.absence.delete({ where: { id: existing.id } });
  }

  const absence = await prisma.absence.create({
    data: {
      employeeId: user.employeeId,
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
  await ensureVacationTask(user.employeeId, employeeName);

  revalidateFerias();
}

// Aprova/rejeita em bloco um período (dias consecutivos pendentes do mesmo
// colaborador), agrupado pela UI de aprovação.
export async function decideVacationPeriod(
  absenceIds: string[],
  decision: "APPROVED" | "REJECTED",
  formData: FormData
) {
  const user = await requireUser();
  if (!canWrite(user.roles, "ferias")) throw new Error("Sem permissão para aprovar férias.");

  const decisionNote = String(formData.get("decisionNote") ?? "").trim() || null;

  const absences = await prisma.absence.findMany({ where: { id: { in: absenceIds } } });
  const pending = absences.filter((a) => a.status === "PENDING");
  if (pending.length === 0) throw new Error("Este período já foi decidido.");

  const employeeId = pending[0].employeeId;

  const byYear = new Map<number, number>();
  for (const a of pending) {
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
    where: { id: { in: pending.map((a) => a.id) } },
    data: { status: decision, approvedById: user.id, decidedAt: new Date(), decisionNote },
  });

  await logAudit({
    userId: user.id,
    action: decision === "APPROVED" ? "APPROVE" : "REJECT",
    entity: "Absence",
    details: `Férias (${pending.length} dia(s))`,
  });

  await resolveVacationTasksIfClear(employeeId);
  revalidateFerias();
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
