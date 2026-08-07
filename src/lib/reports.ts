import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/roles";
import { computeWorkedHoursByDay } from "@/lib/hours";
import { formatDateTime } from "@/lib/format";
import { shiftDurationHours } from "@/lib/schedule";

export type ReportResult = { columns: string[]; rows: (string | number)[][] };
export type ReportFilters = { from: Date; to: Date; employeeIds?: string[] };

export const REPORT_DEFINITIONS: { key: string; label: string; usesRange: boolean }[] = [
  { key: "acessos", label: "Acessos e Perfis", usesRange: false },
  { key: "utilizadores", label: "Utilizadores / Colaboradores", usesRange: false },
  { key: "picagens", label: "Picagens", usesRange: true },
  { key: "ferias", label: "Férias", usesRange: true },
  { key: "ausencias", label: "Ausências", usesRange: true },
  { key: "payroll", label: "Payroll", usesRange: true },
  { key: "escalas", label: "Escalas", usesRange: true },
  { key: "horas_realizadas", label: "Horas Realizadas", usesRange: true },
  { key: "horas_esperadas", label: "Horas Esperadas (Escala)", usesRange: true },
  { key: "saldo_horas", label: "Saldo de Horas (realizadas vs. esperadas)", usesRange: true },
  { key: "acumulados", label: "Acumulados do Ano e Anteriores", usesRange: true },
];

export async function generateReport(key: string, filters: ReportFilters): Promise<ReportResult> {
  switch (key) {
    case "acessos":
      return reportAcessos();
    case "utilizadores":
      return reportUtilizadores();
    case "picagens":
      return reportPicagens(filters);
    case "ferias":
      return reportFerias(filters);
    case "ausencias":
      return reportAusencias(filters);
    case "payroll":
      return reportPayroll(filters);
    case "escalas":
      return reportEscalas(filters);
    case "horas_realizadas":
      return reportHorasRealizadas(filters);
    case "horas_esperadas":
      return reportHorasEsperadas(filters);
    case "saldo_horas":
      return reportSaldoHoras(filters);
    case "acumulados":
      return reportAcumulados(filters);
    default:
      throw new Error("Relatório desconhecido.");
  }
}

function employeeFilter(employeeIds?: string[]) {
  return employeeIds && employeeIds.length > 0 ? { in: employeeIds } : undefined;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// --- Acessos e Utilizadores (sem período) -----------------------------

async function reportAcessos(): Promise<ReportResult> {
  const users = await prisma.user.findMany({
    include: { roles: true, employee: true },
    orderBy: { name: "asc" },
  });
  return {
    columns: ["Nome", "Email", "Perfis", "Estado", "Colaborador associado"],
    rows: users.map((u) => [
      u.name,
      u.email,
      u.roles.map((r) => ROLE_LABELS[r.role] ?? r.role).join("; "),
      u.active ? "Ativo" : "Desativado",
      u.employee ? "Sim" : "Não",
    ]),
  };
}

async function reportUtilizadores(): Promise<ReportResult> {
  const employees = await prisma.employee.findMany({
    include: { department: true, team: true, location: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  return {
    columns: ["Nome", "Email", "Função", "Departamento", "Equipa", "Local", "Estado", "Data de admissão"],
    rows: employees.map((e) => [
      `${e.firstName} ${e.lastName}`,
      e.email,
      e.jobTitle,
      e.department?.name ?? "",
      e.team?.name ?? "",
      e.location?.name ?? "",
      e.status === "ACTIVE" ? "Ativo" : "Inativo",
      e.hireDate ? e.hireDate.toISOString().slice(0, 10) : "",
    ]),
  };
}

// --- Picagens ------------------------------------------------------------

const CLOCK_TYPE_LABELS: Record<string, string> = {
  CLOCK_IN: "Entrada",
  CLOCK_OUT: "Saída",
  BREAK_START: "Início Refeição",
  BREAK_END: "Fim Refeição",
};

async function reportPicagens(filters: ReportFilters): Promise<ReportResult> {
  const entries = await prisma.timeClockEntry.findMany({
    where: {
      timestamp: { gte: filters.from, lte: filters.to },
      employeeId: employeeFilter(filters.employeeIds),
    },
    include: { employee: true },
    orderBy: { timestamp: "asc" },
  });
  return {
    columns: ["Colaborador", "Tipo", "Data/Hora", "Local", "Desvio"],
    rows: entries.map((e) => [
      `${e.employee.firstName} ${e.employee.lastName}`,
      CLOCK_TYPE_LABELS[e.type] ?? e.type,
      formatDateTime(e.timestamp),
      e.location ?? "",
      e.hasDeviation ? e.deviationType ?? "Sim" : "",
    ]),
  };
}

// --- Férias / Ausências ---------------------------------------------------

const ABSENCE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CANCELLED: "Cancelado",
};

async function reportFerias(filters: ReportFilters): Promise<ReportResult> {
  const absences = await prisma.absence.findMany({
    where: {
      absenceType: { isVacation: true },
      employeeId: employeeFilter(filters.employeeIds),
      startDate: { lte: filters.to },
      endDate: { gte: filters.from },
    },
    include: { employee: true },
    orderBy: { startDate: "asc" },
  });
  return {
    columns: ["Colaborador", "Início", "Fim", "Dias", "Estado", "Decidido em"],
    rows: absences.map((a) => [
      `${a.employee.firstName} ${a.employee.lastName}`,
      a.startDate.toISOString().slice(0, 10),
      a.endDate.toISOString().slice(0, 10),
      a.days,
      ABSENCE_STATUS_LABELS[a.status] ?? a.status,
      a.decidedAt ? a.decidedAt.toISOString().slice(0, 10) : "",
    ]),
  };
}

async function reportAusencias(filters: ReportFilters): Promise<ReportResult> {
  const absences = await prisma.absence.findMany({
    where: {
      absenceType: { isVacation: false },
      employeeId: employeeFilter(filters.employeeIds),
      startDate: { lte: filters.to },
      endDate: { gte: filters.from },
    },
    include: { employee: true, absenceType: true },
    orderBy: { startDate: "asc" },
  });
  return {
    columns: ["Colaborador", "Tipo", "Início", "Fim", "Dias", "Estado"],
    rows: absences.map((a) => [
      `${a.employee.firstName} ${a.employee.lastName}`,
      a.absenceType.name,
      a.startDate.toISOString().slice(0, 10),
      a.endDate.toISOString().slice(0, 10),
      a.days,
      ABSENCE_STATUS_LABELS[a.status] ?? a.status,
    ]),
  };
}

// --- Payroll ---------------------------------------------------------------

async function reportPayroll(filters: ReportFilters): Promise<ReportResult> {
  const fromKey = filters.from.getFullYear() * 12 + filters.from.getMonth();
  const toKey = filters.to.getFullYear() * 12 + filters.to.getMonth();

  const payslips = await prisma.payslip.findMany({
    where: { employeeId: employeeFilter(filters.employeeIds) },
    include: { employee: true },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  const filtered = payslips.filter((p) => {
    const key = p.year * 12 + (p.month - 1);
    return key >= fromKey && key <= toKey;
  });

  return {
    columns: [
      "Colaborador",
      "Ano",
      "Mês",
      "Salário base",
      "Horas trabalhadas",
      "Horas extra",
      "Subsídio alimentação",
      "Bruto",
      "Segurança Social",
      "IRS",
      "Líquido",
    ],
    rows: filtered.map((p) => [
      `${p.employee.firstName} ${p.employee.lastName}`,
      p.year,
      p.month,
      round1(p.baseSalary),
      round1(p.workedHours),
      round1(p.overtimeHours),
      round1(p.mealAllowanceTotal),
      round1(p.grossTotal),
      round1(p.socialSecurityEmployee),
      round1(p.irsWithholding),
      round1(p.netTotal),
    ]),
  };
}

// --- Escalas -----------------------------------------------------------

async function reportEscalas(filters: ReportFilters): Promise<ReportResult> {
  const shifts = await prisma.shift.findMany({
    where: {
      date: { gte: filters.from, lte: filters.to },
      employeeId: employeeFilter(filters.employeeIds),
    },
    include: { employee: true, shiftTemplate: true },
    orderBy: { date: "asc" },
  });
  return {
    columns: ["Colaborador", "Data", "Início", "Fim", "Horas previstas", "Estado", "Origem"],
    rows: shifts.map((s) => [
      `${s.employee.firstName} ${s.employee.lastName}`,
      s.date.toISOString().slice(0, 10),
      s.startTime,
      s.endTime,
      round1(shiftDurationHours(s.startTime, s.endTime, s.shiftTemplate?.breakMins ?? 0)),
      s.status === "PUBLISHED" ? "Publicado" : "Rascunho",
      s.source,
    ]),
  };
}

// --- Horas: realizadas / esperadas / saldo --------------------------------

async function workedHoursByEmployee(filters: ReportFilters): Promise<Map<string, number>> {
  const entries = await prisma.timeClockEntry.findMany({
    where: {
      timestamp: { gte: filters.from, lte: filters.to },
      employeeId: employeeFilter(filters.employeeIds),
    },
    select: { employeeId: true, type: true, timestamp: true },
  });
  const byEmployee = new Map<string, { type: string; timestamp: Date }[]>();
  for (const e of entries) {
    if (!byEmployee.has(e.employeeId)) byEmployee.set(e.employeeId, []);
    byEmployee.get(e.employeeId)!.push(e);
  }
  const totals = new Map<string, number>();
  for (const [employeeId, list] of byEmployee) {
    const byDay = computeWorkedHoursByDay(list);
    let total = 0;
    for (const hours of byDay.values()) total += hours;
    totals.set(employeeId, total);
  }
  return totals;
}

async function expectedHoursByEmployee(filters: ReportFilters): Promise<Map<string, number>> {
  const shifts = await prisma.shift.findMany({
    where: {
      date: { gte: filters.from, lte: filters.to },
      employeeId: employeeFilter(filters.employeeIds),
    },
    include: { shiftTemplate: true },
  });
  const totals = new Map<string, number>();
  for (const s of shifts) {
    const hours = shiftDurationHours(s.startTime, s.endTime, s.shiftTemplate?.breakMins ?? 0);
    totals.set(s.employeeId, (totals.get(s.employeeId) ?? 0) + hours);
  }
  return totals;
}

async function employeeNames(employeeIds: string[]): Promise<Map<string, string>> {
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  return new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]));
}

async function reportHorasRealizadas(filters: ReportFilters): Promise<ReportResult> {
  const totals = await workedHoursByEmployee(filters);
  const names = await employeeNames(Array.from(totals.keys()));
  return {
    columns: ["Colaborador", "Horas realizadas"],
    rows: Array.from(totals.entries())
      .map(([id, hours]) => [names.get(id) ?? id, round1(hours)] as (string | number)[])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  };
}

async function reportHorasEsperadas(filters: ReportFilters): Promise<ReportResult> {
  const totals = await expectedHoursByEmployee(filters);
  const names = await employeeNames(Array.from(totals.keys()));
  return {
    columns: ["Colaborador", "Horas esperadas (escala)"],
    rows: Array.from(totals.entries())
      .map(([id, hours]) => [names.get(id) ?? id, round1(hours)] as (string | number)[])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  };
}

async function reportSaldoHoras(filters: ReportFilters): Promise<ReportResult> {
  const [worked, expected] = await Promise.all([
    workedHoursByEmployee(filters),
    expectedHoursByEmployee(filters),
  ]);
  const allIds = new Set([...worked.keys(), ...expected.keys()]);
  const names = await employeeNames(Array.from(allIds));

  const rows = Array.from(allIds).map((id) => {
    const w = worked.get(id) ?? 0;
    const e = expected.get(id) ?? 0;
    return [names.get(id) ?? id, round1(w), round1(e), round1(w - e)] as (string | number)[];
  });
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  return {
    columns: ["Colaborador", "Horas realizadas", "Horas esperadas", "Saldo"],
    rows,
  };
}

// --- Acumulados do ano e de anos anteriores -------------------------------

async function reportAcumulados(filters: ReportFilters): Promise<ReportResult> {
  const currentYear = filters.to.getFullYear();
  const priorYear = currentYear - 1;

  async function yearHoursSaldo(year: number, employeeIds?: string[]) {
    return reportSaldoHoras({
      from: new Date(year, 0, 1),
      to: new Date(year, 11, 31, 23, 59, 59),
      employeeIds,
    });
  }

  const [currentSaldo, priorSaldo] = await Promise.all([
    yearHoursSaldo(currentYear, filters.employeeIds),
    yearHoursSaldo(priorYear, filters.employeeIds),
  ]);

  const priorByName = new Map(priorSaldo.rows.map((r) => [r[0], r[3]]));

  const employeeIds =
    filters.employeeIds && filters.employeeIds.length > 0
      ? filters.employeeIds
      : (await prisma.employee.findMany({ select: { id: true } })).map((e) => e.id);

  const vacationBalances = await prisma.absenceBalance.findMany({
    where: { employeeId: { in: employeeIds }, year: currentYear, absenceType: { isVacation: true } },
    include: { employee: true },
  });
  const vacationByEmployee = new Map(
    vacationBalances.map((b) => [
      `${b.employee.firstName} ${b.employee.lastName}`,
      round1(b.entitledDays + b.carryOverDays - b.usedDays - b.plannedDays),
    ])
  );

  const rows = currentSaldo.rows.map((r) => {
    const name = r[0];
    return [
      name,
      r[3],
      priorByName.get(name) ?? 0,
      vacationByEmployee.get(String(name)) ?? "",
    ] as (string | number)[];
  });

  return {
    columns: [
      "Colaborador",
      `Saldo de horas ${currentYear}`,
      `Saldo de horas ${priorYear}`,
      `Saldo de férias ${currentYear}`,
    ],
    rows,
  };
}
