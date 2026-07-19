import { prisma } from "@/lib/prisma";

// O módulo de Férias reaproveita o modelo Absence/AbsenceType/AbsenceBalance
// já existente das Ausências — só filtrando sempre pelo AbsenceType marcado
// isVacation=true. Cada dia de férias pedido é um Absence de um só dia
// (startDate === endDate), o que simplifica marcar/desmarcar dias soltos no
// calendário; dias consecutivos são agrupados em "períodos" para aprovação.
//
// Um dia já aprovado não pode ser desmarcado diretamente pelo colaborador —
// fica marcado com este "reason" sentinela (sem alterar o status, que
// continua APPROVED) enquanto aguarda confirmação de cancelamento por quem
// tem perfil de gestão. Este campo nunca é preenchido pelo próprio
// colaborador com texto livre no módulo de Férias, por isso é seguro
// reutilizá-lo como sinalizador.
export const CANCEL_REQUEST_MARKER = "__CANCEL_REQUEST__";

export type EffectiveStatus = "PENDING" | "APPROVED" | "CANCEL_PENDING";

export function effectiveStatus(row: { status: string; reason: string | null }): EffectiveStatus {
  if (row.status === "APPROVED" && row.reason === CANCEL_REQUEST_MARKER) return "CANCEL_PENDING";
  return row.status as EffectiveStatus;
}

// Datas de férias são guardadas à meia-noite local. toISOString() converte
// para UTC e pode "recuar" um dia consoante o fuso horário do processo —
// esta função lê sempre os componentes locais, tal como o calendário.
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

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
  kind: EffectiveStatus;
};

// Agrupa dias (um Absence por dia) consecutivos do mesmo colaborador e do
// mesmo tipo efetivo (pedido novo / aprovado / pedido de cancelamento) em
// períodos contínuos — usado na aprovação e nos resumos.
export function groupIntoPeriods(rows: VacationDayRow[]): VacationPeriod[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.employeeId !== b.employeeId) return a.employeeId < b.employeeId ? -1 : 1;
    return a.date.getTime() - b.date.getTime();
  });

  const periods: VacationPeriod[] = [];
  for (const row of sorted) {
    const kind = effectiveStatus(row);
    const last = periods[periods.length - 1];
    if (
      last &&
      last.employeeId === row.employeeId &&
      last.kind === kind &&
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
        kind,
      });
    }
  }
  return periods;
}

// Cria (se ainda não existir) uma tarefa de validação para a chefia de
// equipa (Gestor de Equipa do departamento) e para os Administradores de RH,
// sempre que um colaborador submete um pedido de férias ou um pedido de
// cancelamento de férias já aprovadas.
export async function ensureVacationTask(
  employeeId: string,
  employeeName: string,
  kind: "REQUEST" | "CANCELLATION" = "REQUEST"
) {
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

  const title =
    kind === "CANCELLATION"
      ? `Pedido de cancelamento de férias — ${employeeName}`
      : `Pedido de férias — ${employeeName}`;
  const description =
    kind === "CANCELLATION"
      ? `${employeeName} pediu para cancelar dias de férias já aprovados. Reveja em Férias → Para Aprovação.`
      : `${employeeName} submeteu um pedido de férias. Reveja e aprove/rejeite em Férias → Para Aprovação.`;

  await prisma.task.createMany({
    data: toCreate.map((assigneeId) => ({
      title,
      description,
      type: "VACATION_REQUEST",
      assigneeId,
      employeeId,
    })),
  });
}

// Fecha as tarefas de validação de férias de um colaborador quando já não
// tem nenhum pedido novo nem pedido de cancelamento por decidir.
export async function resolveVacationTasksIfClear(employeeId: string) {
  const [stillPending, stillCancelPending] = await Promise.all([
    prisma.absence.count({
      where: { employeeId, status: "PENDING", absenceType: { isVacation: true } },
    }),
    prisma.absence.count({
      where: {
        employeeId,
        status: "APPROVED",
        reason: CANCEL_REQUEST_MARKER,
        absenceType: { isVacation: true },
      },
    }),
  ]);
  if (stillPending > 0 || stillCancelPending > 0) return;

  await prisma.task.updateMany({
    where: { type: "VACATION_REQUEST", employeeId, status: "OPEN" },
    data: { status: "DONE", resolvedAt: new Date() },
  });
}
