import { prisma } from "@/lib/prisma";

// O módulo de Férias reaproveita o modelo Absence/AbsenceType/AbsenceBalance
// já existente das Ausências — só filtrando sempre pelo AbsenceType marcado
// isVacation=true. Cada dia de férias pedido é um Absence de um só dia
// (startDate === endDate), o que simplifica marcar/desmarcar dias soltos no
// calendário; dias consecutivos são agrupados em "períodos" para aprovação.

export async function getVacationType() {
  const type = await prisma.absenceType.findFirst({ where: { isVacation: true } });
  if (!type) {
    throw new Error(
      "O tipo de ausência \"Férias\" não está configurado (isVacation). Corra o seed novamente."
    );
  }
  return type;
}

export async function getOrCreateVacationBalance(employeeId: string, year: number) {
  const type = await getVacationType();
  const existing = await prisma.absenceBalance.findUnique({
    where: { employeeId_absenceTypeId_year: { employeeId, absenceTypeId: type.id, year } },
  });
  if (existing) return { balance: existing, type };

  const balance = await prisma.absenceBalance.create({
    data: {
      employeeId,
      absenceTypeId: type.id,
      year,
      entitledDays: type.annualLimitDays ?? 22,
    },
  });
  return { balance, type };
}

export type VacationHeadcount = {
  entitled: number;
  carryOver: number;
  total: number;
  marked: number;
  approved: number;
  saldo: number;
};

export function computeHeadcount(balance: {
  entitledDays: number;
  carryOverDays: number;
  usedDays: number;
  plannedDays: number;
}): VacationHeadcount {
  const total = balance.entitledDays + balance.carryOverDays;
  const marked = balance.plannedDays + balance.usedDays;
  return {
    entitled: balance.entitledDays,
    carryOver: balance.carryOverDays,
    total,
    marked,
    approved: balance.usedDays,
    saldo: total - marked,
  };
}

export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function nextBusinessDay(date: Date): Date {
  const next = new Date(date);
  do {
    next.setDate(next.getDate() + 1);
  } while (!isWeekday(next));
  return next;
}

export type VacationDayRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  status: string;
  reason: string | null;
};

export type VacationPeriod = {
  employeeId: string;
  employeeName: string;
  startDate: Date;
  endDate: Date;
  absenceIds: string[];
  status: string;
  reason: string | null;
};

// Agrupa dias (um Absence por dia) consecutivos do mesmo colaborador e do
// mesmo estado em períodos contínuos — usado na aprovação e nos resumos.
export function groupIntoPeriods(rows: VacationDayRow[]): VacationPeriod[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.employeeId !== b.employeeId) return a.employeeId < b.employeeId ? -1 : 1;
    return a.date.getTime() - b.date.getTime();
  });

  const periods: VacationPeriod[] = [];
  for (const row of sorted) {
    const last = periods[periods.length - 1];
    if (
      last &&
      last.employeeId === row.employeeId &&
      last.status === row.status &&
      nextBusinessDay(last.endDate).getTime() === row.date.getTime()
    ) {
      last.endDate = row.date;
      last.absenceIds.push(row.id);
    } else {
      periods.push({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        startDate: row.date,
        endDate: row.date,
        absenceIds: [row.id],
        status: row.status,
        reason: row.reason,
      });
    }
  }
  return periods;
}

// Cria (se ainda não existir) uma tarefa de validação para a chefia de
// equipa (Gestor de Equipa do departamento) e para os Administradores de RH,
// sempre que um colaborador submete um pedido de férias.
export async function ensureVacationTask(employeeId: string, employeeName: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { departmentId: true },
  });
  if (!employee) return;

  const assigneeIds = new Set<string>();

  const rhAdmins = await prisma.user.findMany({
    where: { active: true, roles: { some: { role: "ADMIN_RH" } } },
    select: { id: true },
  });
  rhAdmins.forEach((u) => assigneeIds.add(u.id));

  if (employee.departmentId) {
    const managers = await prisma.user.findMany({
      where: {
        active: true,
        roles: { some: { role: "GESTOR_EQUIPA", departmentId: employee.departmentId } },
      },
      select: { id: true },
    });
    managers.forEach((u) => assigneeIds.add(u.id));
  }

  if (assigneeIds.size === 0) return;

  const existing = await prisma.task.findMany({
    where: {
      type: "VACATION_REQUEST",
      employeeId,
      status: "OPEN",
      assigneeId: { in: Array.from(assigneeIds) },
    },
    select: { assigneeId: true },
  });
  const already = new Set(existing.map((t) => t.assigneeId));
  const toCreate = Array.from(assigneeIds).filter((id) => !already.has(id));
  if (toCreate.length === 0) return;

  await prisma.task.createMany({
    data: toCreate.map((assigneeId) => ({
      title: `Pedido de férias — ${employeeName}`,
      description: `${employeeName} submeteu um pedido de férias. Reveja e aprove/rejeite em Férias → Para Aprovação.`,
      type: "VACATION_REQUEST",
      assigneeId,
      employeeId,
    })),
  });
}

// Fecha as tarefas de validação de férias de um colaborador quando já não
// tem nenhum dia pendente por decidir.
export async function resolveVacationTasksIfClear(employeeId: string) {
  const stillPending = await prisma.absence.count({
    where: { employeeId, status: "PENDING", absenceType: { isVacation: true } },
  });
  if (stillPending > 0) return;

  await prisma.task.updateMany({
    where: { type: "VACATION_REQUEST", employeeId, status: "OPEN" },
    data: { status: "DONE", resolvedAt: new Date() },
  });
}
