import { prisma } from "@/lib/prisma";
import { computeWorkedHoursByDay } from "@/lib/hours";
import { isoDate } from "@/lib/dates";

// ---------------------------------------------------------------------------
// Pressupostos e escalões de IRS — valores por omissão configuráveis.
// Não são uma cópia das tabelas oficiais da Autoridade Tributária (essas
// variam por estado civil/dependentes/região e mudam todos os anos); servem
// de ponto de partida razoável, editável por RH/Admin em /payroll/pressupostos.
// ---------------------------------------------------------------------------

const DEFAULT_IRS_BRACKETS = [
  { order: 1, upToGross: 870, rate: 0 },
  { order: 2, upToGross: 1000, rate: 0.13 },
  { order: 3, upToGross: 1300, rate: 0.165 },
  { order: 4, upToGross: 1800, rate: 0.21 },
  { order: 5, upToGross: 2500, rate: 0.26 },
  { order: 6, upToGross: 3500, rate: 0.32 },
  { order: 7, upToGross: 5000, rate: 0.37 },
  { order: 8, upToGross: null, rate: 0.45 },
];

export async function getPayrollSettings() {
  const existing = await prisma.payrollSettings.findFirst();
  if (existing) return existing;
  return prisma.payrollSettings.create({ data: {} });
}

export async function getIrsBrackets() {
  const existing = await prisma.irsBracket.findMany({ orderBy: { order: "asc" } });
  if (existing.length > 0) return existing;
  await prisma.irsBracket.createMany({ data: DEFAULT_IRS_BRACKETS });
  return prisma.irsBracket.findMany({ orderBy: { order: "asc" } });
}

export function computeIrsWithholding(
  taxableGross: number,
  brackets: { upToGross: number | null; rate: number }[]
): number {
  let tax = 0;
  let lower = 0;
  for (const bracket of brackets) {
    const upper = bracket.upToGross ?? Infinity;
    if (taxableGross <= lower) break;
    const amountInBracket = Math.min(taxableGross, upper) - lower;
    tax += amountInBracket * bracket.rate;
    lower = upper;
  }
  return Math.max(0, tax);
}

function overlapDays(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): number {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (end < start) return 0;
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export type PayslipBreakdown = {
  employeeId: string;
  year: number;
  month: number;
  baseSalary: number;
  contractedWeeklyHours: number;
  workedHours: number;
  overtimeHours: number;
  overtimePay: number;
  mealAllowanceTotal: number;
  mealAllowanceExempt: number;
  mealAllowanceTaxable: number;
  absenceDeductionDays: number;
  absenceDeduction: number;
  otherEarnings: number;
  otherDeductions: number;
  vacationSubsidy: number;
  christmasSubsidy: number;
  grossTaxable: number;
  grossTotal: number;
  socialSecurityEmployee: number;
  irsWithholding: number;
  netTotal: number;
  socialSecurityEmployer: number;
  employerCost: number;
  belowMinimumWage: boolean;
  workedDays: number;
};

// Motor de cálculo do recibo de vencimento: cruza contrato ativo, picagens,
// horário gerado (turnos publicados) e ausências não remuneradas do período.
export async function computePayslipBreakdown(
  employeeId: string,
  year: number,
  month: number
): Promise<PayslipBreakdown> {
  const [settings, irsBrackets, employee] = await Promise.all([
    getPayrollSettings(),
    getIrsBrackets(),
    prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      include: {
        contracts: { where: { status: "ACTIVE" }, orderBy: { startDate: "desc" }, take: 1 },
      },
    }),
  ]);

  const contract = employee.contracts[0];
  const baseSalary = contract?.baseSalary ?? 0;
  const contractedWeeklyHours = contract?.weeklyHours ?? employee.weeklyHours;
  const contractedDailyHours = contractedWeeklyHours / 5;

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const [entries, shifts, unpaidAbsences, components] = await Promise.all([
    prisma.timeClockEntry.findMany({
      where: { employeeId, timestamp: { gte: periodStart, lte: periodEnd } },
      orderBy: { timestamp: "asc" },
    }),
    prisma.shift.findMany({
      where: { employeeId, date: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.absence.findMany({
      where: {
        employeeId,
        status: "APPROVED",
        absenceType: { paid: false },
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
    }),
    prisma.payrollComponent.findMany({
      where: {
        employeeId,
        OR: [{ recurring: true }, { recurring: false, applyYear: year, applyMonth: month }],
      },
    }),
  ]);

  const shiftByDay = new Map(shifts.map((s) => [isoDate(s.date), s]));
  const workedByDay = computeWorkedHoursByDay(entries);

  let workedHours = 0;
  let overtimeHours = 0;
  let overtimePay = 0;
  const regularHourRate = contractedWeeklyHours > 0 ? (baseSalary / (contractedWeeklyHours * (52 / 12))) : 0;

  for (const [dayIso, hoursWorked] of workedByDay.entries()) {
    workedHours += hoursWorked;
    const date = new Date(dayIso + "T12:00:00");
    const shift = shiftByDay.get(dayIso);
    const contractedForDay = shift
      ? timeDiffHours(shift.startTime, shift.endTime)
      : contractedDailyHours;

    const overtimeForDay = Math.max(0, hoursWorked - contractedForDay);
    if (overtimeForDay > 0) {
      overtimeHours += overtimeForDay;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (isWeekend) {
        overtimePay += overtimeForDay * regularHourRate * settings.overtimeRateWeekendHoliday;
      } else {
        const firstHour = Math.min(overtimeForDay, 1);
        const rest = overtimeForDay - firstHour;
        overtimePay +=
          firstHour * regularHourRate * settings.overtimeRateFirstHour +
          rest * regularHourRate * settings.overtimeRateAdditional;
      }
    }
  }

  const workedDays = workedByDay.size;

  let absenceDeductionDays = 0;
  for (const absence of unpaidAbsences) {
    absenceDeductionDays += overlapDays(absence.startDate, absence.endDate, periodStart, periodEnd);
  }
  const dailyRate = settings.workingDaysPerMonth > 0 ? baseSalary / settings.workingDaysPerMonth : 0;
  const absenceDeduction = absenceDeductionDays * dailyRate;

  const mealAllowanceDaily = employee.mealAllowanceOverride ?? settings.mealAllowanceDaily;
  const mealAllowanceTotal = workedDays * mealAllowanceDaily;
  const mealAllowanceExempt = Math.min(mealAllowanceTotal, workedDays * settings.mealAllowanceExemptCap);
  const mealAllowanceTaxable = mealAllowanceTotal - mealAllowanceExempt;

  const earningComponents = components.filter((c) => c.type === "EARNING");
  const deductionComponents = components.filter((c) => c.type === "DEDUCTION");
  const otherEarnings = earningComponents.reduce((sum, c) => sum + c.amount, 0);
  const otherDeductions = deductionComponents.reduce((sum, c) => sum + c.amount, 0);

  const vacationSubsidy =
    settings.vacationSubsidyMode === "MONTHLY_DUODECIMOS"
      ? baseSalary / 12
      : month === 6
        ? baseSalary
        : 0;
  const christmasSubsidy =
    settings.christmasSubsidyMode === "MONTHLY_DUODECIMOS"
      ? baseSalary / 12
      : month === 12
        ? baseSalary
        : 0;

  const grossTaxable =
    baseSalary -
    absenceDeduction +
    overtimePay +
    mealAllowanceTaxable +
    otherEarnings +
    vacationSubsidy +
    christmasSubsidy;

  const socialSecurityEmployee = Math.max(0, grossTaxable) * settings.socialSecurityEmployeeRate;
  const irsWithholding = computeIrsWithholding(Math.max(0, grossTaxable), irsBrackets);
  const grossTotal = grossTaxable + mealAllowanceExempt;
  const netTotal = grossTotal - socialSecurityEmployee - irsWithholding - otherDeductions;
  const socialSecurityEmployer = Math.max(0, grossTaxable) * settings.socialSecurityEmployerRate;
  const employerCost =
    grossTotal + socialSecurityEmployer + Math.max(0, grossTaxable) * settings.workAccidentInsuranceRate;

  return {
    employeeId,
    year,
    month,
    baseSalary,
    contractedWeeklyHours,
    workedHours,
    overtimeHours,
    overtimePay,
    mealAllowanceTotal,
    mealAllowanceExempt,
    mealAllowanceTaxable,
    absenceDeductionDays,
    absenceDeduction,
    otherEarnings,
    otherDeductions,
    vacationSubsidy,
    christmasSubsidy,
    grossTaxable,
    grossTotal,
    socialSecurityEmployee,
    irsWithholding,
    netTotal,
    socialSecurityEmployer,
    employerCost,
    belowMinimumWage: baseSalary > 0 && baseSalary < settings.minimumWage,
    workedDays,
  };
}

// Subconjunto do PayslipBreakdown que corresponde exatamente aos campos
// persistidos no modelo Payslip (evita espalhar campos auxiliares como
// contractedWeeklyHours/grossTaxable/mealAllowanceTaxable, que existem só
// para o cálculo intermédio).
export function toPayslipRecord(b: PayslipBreakdown) {
  return {
    employeeId: b.employeeId,
    year: b.year,
    month: b.month,
    baseSalary: b.baseSalary,
    workedHours: b.workedHours,
    workedDays: b.workedDays,
    overtimeHours: b.overtimeHours,
    overtimePay: b.overtimePay,
    mealAllowanceTotal: b.mealAllowanceTotal,
    mealAllowanceExempt: b.mealAllowanceExempt,
    absenceDeductionDays: b.absenceDeductionDays,
    absenceDeduction: b.absenceDeduction,
    otherEarnings: b.otherEarnings,
    otherDeductions: b.otherDeductions,
    vacationSubsidy: b.vacationSubsidy,
    christmasSubsidy: b.christmasSubsidy,
    grossTotal: b.grossTotal,
    socialSecurityEmployee: b.socialSecurityEmployee,
    irsWithholding: b.irsWithholding,
    netTotal: b.netTotal,
    socialSecurityEmployer: b.socialSecurityEmployer,
    employerCost: b.employerCost,
    belowMinimumWage: b.belowMinimumWage,
  };
}

function timeDiffHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60; // turno noturno que passa a meia-noite
  return minutes / 60;
}
