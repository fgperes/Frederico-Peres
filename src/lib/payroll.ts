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

export const FISCAL_REGIONS = ["CONTINENTE", "ACORES", "MADEIRA"] as const;
export const FISCAL_REGION_LABELS: Record<string, string> = {
  CONTINENTE: "Continente",
  ACORES: "Açores",
  MADEIRA: "Madeira",
};

export async function getIrsTables() {
  return prisma.irsTable.findMany({
    include: { brackets: { orderBy: { order: "asc" } } },
    orderBy: [{ year: "desc" }, { region: "asc" }],
  });
}

// Escolhe a tabela de IRS a aplicar a um recibo: a combinação exata
// ano+região se existir; caso contrário cai para a região Continente do
// mesmo ano e, na falta de tabelas para o ano pedido, para a tabela mais
// recente disponível (região pedida, depois Continente). Sem nenhuma
// tabela configurada, semeia uma tabela por omissão para o ano pedido —
// tal como o comportamento antigo (lista única global).
export async function getIrsBracketsFor(year: number, region: string) {
  const tables = await getIrsTables();

  if (tables.length === 0) {
    const seeded = await prisma.irsTable.create({
      data: {
        year,
        region: "CONTINENTE",
        label: "Tabela por omissão",
        brackets: { createMany: { data: DEFAULT_IRS_BRACKETS } },
      },
      include: { brackets: { orderBy: { order: "asc" } } },
    });
    return seeded.brackets;
  }

  const exact = tables.find((t) => t.year === year && t.region === region);
  if (exact) return exact.brackets;

  const sameYearContinente = tables.find((t) => t.year === year && t.region === "CONTINENTE");
  if (sameYearContinente) return sameYearContinente.brackets;

  const candidatesForRegion = tables
    .filter((t) => t.region === region && t.year <= year)
    .sort((a, b) => b.year - a.year);
  if (candidatesForRegion[0]) return candidatesForRegion[0].brackets;

  const candidatesContinente = tables
    .filter((t) => t.region === "CONTINENTE" && t.year <= year)
    .sort((a, b) => b.year - a.year);
  if (candidatesContinente[0]) return candidatesContinente[0].brackets;

  // Nenhuma tabela igual ou anterior ao ano pedido — usa a mais antiga
  // disponível, para nunca ficar sem retenção nenhuma calculada.
  const oldestFirst = [...tables].sort((a, b) => a.year - b.year);
  return oldestFirst[0].brackets;
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
  const [settings, employee] = await Promise.all([
    getPayrollSettings(),
    prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      include: {
        employeeContracts: {
          where: { status: "ACTIVE" },
          orderBy: { startDate: "desc" },
          take: 1,
          include: { contractProfile: true },
        },
      },
    }),
  ]);
  const irsBrackets = await getIrsBracketsFor(year, employee.fiscalRegion);

  const contract = employee.employeeContracts[0];
  const baseSalary = contract?.baseSalary ?? 0;
  const contractedWeeklyHours = contract?.contractProfile.weeklyHours ?? employee.weeklyHours;
  const contractedDailyHours = contractedWeeklyHours / 5;

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const [entries, shifts, absencesWithImpact, components, hoursCorrections] = await Promise.all([
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
        absenceType: { salaryImpactPercent: { lt: 100 } },
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
      include: { absenceType: { select: { salaryImpactPercent: true } } },
    }),
    prisma.payrollComponent.findMany({
      where: {
        employeeId,
        OR: [{ recurring: true }, { recurring: false, applyYear: year, applyMonth: month }],
      },
    }),
    prisma.hoursCorrection.findMany({
      where: { employeeId, date: { gte: periodStart, lte: periodEnd } },
    }),
  ]);

  const shiftByDay = new Map(shifts.map((s) => [isoDate(s.date), s]));
  const workedByDay = computeWorkedHoursByDay(entries);

  // Correções manuais de picagens/execução (Picagens → Execução) têm de se
  // refletir no recibo — cada uma guarda o desvio (minutos) face ao valor
  // em bruto para um dia e lado (ACTUAL = horas reais, SCHEDULED = horário
  // previsto), tal como já é aplicado na grelha de execução.
  const actualCorrMinByDay = new Map<string, number>();
  const scheduledCorrMinByDay = new Map<string, number>();
  for (const c of hoursCorrections) {
    const key = isoDate(c.date);
    if (c.field === "ACTUAL") actualCorrMinByDay.set(key, c.minutesDelta);
    else if (c.field === "SCHEDULED") scheduledCorrMinByDay.set(key, c.minutesDelta);
  }

  let workedHours = 0;
  let overtimeHours = 0;
  let overtimePay = 0;
  let workedDays = 0;
  const regularHourRate = contractedWeeklyHours > 0 ? (baseSalary / (contractedWeeklyHours * (52 / 12))) : 0;

  const dayKeys = new Set<string>([...workedByDay.keys(), ...actualCorrMinByDay.keys()]);
  for (const dayIso of dayKeys) {
    const rawHours = workedByDay.get(dayIso) ?? 0;
    const hoursWorked = Math.max(0, rawHours + (actualCorrMinByDay.get(dayIso) ?? 0) / 60);
    if (hoursWorked === 0) continue;

    workedHours += hoursWorked;
    workedDays++;
    const date = new Date(dayIso + "T12:00:00");
    const shift = shiftByDay.get(dayIso);
    const scheduledRaw = shift ? timeDiffHours(shift.startTime, shift.endTime) : contractedDailyHours;
    const contractedForDay = Math.max(0, scheduledRaw + (scheduledCorrMinByDay.get(dayIso) ?? 0) / 60);

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

  // Cada dia de ausência com impacto salarial < 100% desconta a fração
  // correspondente da diária (0% = desconto total, 50% = meia diária, etc.).
  const dailyRate = settings.workingDaysPerMonth > 0 ? baseSalary / settings.workingDaysPerMonth : 0;
  let absenceDeductionDays = 0;
  let absenceDeduction = 0;
  for (const absence of absencesWithImpact) {
    const days = overlapDays(absence.startDate, absence.endDate, periodStart, periodEnd);
    const unpaidFraction = 1 - absence.absenceType.salaryImpactPercent / 100;
    absenceDeductionDays += days * unpaidFraction;
    absenceDeduction += days * unpaidFraction * dailyRate;
  }

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

// ---------------------------------------------------------------------------
// Layout do recibo de vencimento — que linhas aparecem, com que texto e por
// que ordem, tanto na pré-visualização no ecrã como no PDF. Configurável em
// /payroll/layout; guardado como JSON (lineItemsJson) para não obrigar a
// alterar o esquema de base de dados sempre que se ajusta o layout.
// ---------------------------------------------------------------------------

export type PayslipSection = "EARNINGS" | "DEDUCTIONS";

export type PayslipLineItemKey =
  | "baseSalary"
  | "overtimePay"
  | "mealAllowanceTotal"
  | "vacationSubsidy"
  | "christmasSubsidy"
  | "otherEarnings"
  | "absenceDeduction"
  | "socialSecurityEmployee"
  | "irsWithholding"
  | "otherDeductions";

export type PayslipLineItemConfig = {
  key: PayslipLineItemKey;
  label: string;
  section: PayslipSection;
  visible: boolean;
};

// Linhas que aparecem sempre que visíveis, mesmo a 0€ (fazem sempre parte
// de um recibo); as restantes só aparecem quando têm valor.
const ALWAYS_SHOW_LINE_ITEMS = new Set<PayslipLineItemKey>([
  "baseSalary",
  "socialSecurityEmployee",
  "irsWithholding",
]);

export const DEFAULT_PAYSLIP_LINE_ITEMS: PayslipLineItemConfig[] = [
  { key: "baseSalary", label: "Salário base", section: "EARNINGS", visible: true },
  { key: "overtimePay", label: "Horas extra", section: "EARNINGS", visible: true },
  { key: "mealAllowanceTotal", label: "Subsídio de alimentação", section: "EARNINGS", visible: true },
  { key: "vacationSubsidy", label: "Subsídio de férias", section: "EARNINGS", visible: true },
  { key: "christmasSubsidy", label: "Subsídio de Natal", section: "EARNINGS", visible: true },
  { key: "otherEarnings", label: "Outros vencimentos", section: "EARNINGS", visible: true },
  { key: "absenceDeduction", label: "Desconto por faltas não remuneradas", section: "EARNINGS", visible: true },
  { key: "socialSecurityEmployee", label: "Segurança Social (trabalhador)", section: "DEDUCTIONS", visible: true },
  { key: "irsWithholding", label: "IRS — retenção na fonte (estimativa)", section: "DEDUCTIONS", visible: true },
  { key: "otherDeductions", label: "Outros descontos", section: "DEDUCTIONS", visible: true },
];

const DEFAULT_PAYSLIP_FOOTER_NOTE =
  "Documento gerado automaticamente com base em pressupostos configuráveis (taxas de SS e escalões de IRS de referência). " +
  "Não substitui um processamento de salários certificado — confirme os valores com a contabilidade.";

export type PayslipLayoutSettingsData = {
  id: string;
  documentTitle: string;
  footerNote: string;
  lineItems: PayslipLineItemConfig[];
};

function parsePayslipLineItems(json: string): PayslipLineItemConfig[] {
  try {
    const parsed = JSON.parse(json) as PayslipLineItemConfig[];
    const knownKeys = new Set(DEFAULT_PAYSLIP_LINE_ITEMS.map((i) => i.key));
    // Preserva a ordem e as personalizações guardadas para chaves
    // conhecidas; ignora chaves obsoletas e acrescenta no fim quaisquer
    // linhas novas que o código tenha passado a suportar entretanto.
    const kept = parsed.filter((i) => knownKeys.has(i.key));
    const keptKeys = new Set(kept.map((i) => i.key));
    const appended = DEFAULT_PAYSLIP_LINE_ITEMS.filter((def) => !keptKeys.has(def.key));
    return [...kept, ...appended];
  } catch {
    return DEFAULT_PAYSLIP_LINE_ITEMS;
  }
}

export async function getPayslipLayoutSettings(): Promise<PayslipLayoutSettingsData> {
  const existing = await prisma.payslipLayoutSettings.findFirst();
  if (existing) {
    return {
      id: existing.id,
      documentTitle: existing.documentTitle,
      footerNote: existing.footerNote ?? DEFAULT_PAYSLIP_FOOTER_NOTE,
      lineItems: parsePayslipLineItems(existing.lineItemsJson),
    };
  }
  const created = await prisma.payslipLayoutSettings.create({
    data: { lineItemsJson: JSON.stringify(DEFAULT_PAYSLIP_LINE_ITEMS) },
  });
  return {
    id: created.id,
    documentTitle: created.documentTitle,
    footerNote: DEFAULT_PAYSLIP_FOOTER_NOTE,
    lineItems: DEFAULT_PAYSLIP_LINE_ITEMS,
  };
}

export type PayslipLine = { key: PayslipLineItemKey; label: string; section: PayslipSection; value: number };

// Subconjunto do PayslipBreakdown (ou de um Payslip já gerado — os campos
// coincidem) necessário para montar as linhas do recibo segundo o layout
// configurado.
type PayslipLineSource = {
  baseSalary: number;
  overtimeHours: number;
  overtimePay: number;
  mealAllowanceTotal: number;
  vacationSubsidy: number;
  christmasSubsidy: number;
  otherEarnings: number;
  absenceDeductionDays: number;
  absenceDeduction: number;
  socialSecurityEmployee: number;
  irsWithholding: number;
  otherDeductions: number;
};

function payslipLineValue(source: PayslipLineSource, key: PayslipLineItemKey): { value: number; suffix: string } {
  switch (key) {
    case "baseSalary":
      return { value: source.baseSalary, suffix: "" };
    case "overtimePay":
      return {
        value: source.overtimePay,
        suffix: source.overtimeHours > 0 ? ` (${source.overtimeHours.toFixed(1)}h)` : "",
      };
    case "mealAllowanceTotal":
      return { value: source.mealAllowanceTotal, suffix: "" };
    case "vacationSubsidy":
      return { value: source.vacationSubsidy, suffix: "" };
    case "christmasSubsidy":
      return { value: source.christmasSubsidy, suffix: "" };
    case "otherEarnings":
      return { value: source.otherEarnings, suffix: "" };
    case "absenceDeduction":
      return {
        value: -source.absenceDeduction,
        suffix: source.absenceDeductionDays > 0 ? ` (${source.absenceDeductionDays.toFixed(1)}d)` : "",
      };
    case "socialSecurityEmployee":
      return { value: -source.socialSecurityEmployee, suffix: "" };
    case "irsWithholding":
      return { value: -source.irsWithholding, suffix: "" };
    case "otherDeductions":
      return { value: -source.otherDeductions, suffix: "" };
  }
}

// Aplica o layout configurado (ordem, texto e visibilidade) aos valores
// calculados de um recibo — usado tanto na pré-visualização no ecrã como
// no PDF, para que os dois mostrem sempre exatamente as mesmas linhas.
export function buildPayslipLines(source: PayslipLineSource, lineItems: PayslipLineItemConfig[]): PayslipLine[] {
  const lines: PayslipLine[] = [];
  for (const item of lineItems) {
    if (!item.visible) continue;
    const { value, suffix } = payslipLineValue(source, item.key);
    if (!ALWAYS_SHOW_LINE_ITEMS.has(item.key) && value === 0) continue;
    lines.push({ key: item.key, label: item.label + suffix, section: item.section, value });
  }
  return lines;
}
