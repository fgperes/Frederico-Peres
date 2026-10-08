import { prisma } from "@/lib/prisma";
import { computeWorkedHoursByDay } from "@/lib/hours";
import { isoDate } from "@/lib/dates";
import { shiftDurationHours } from "@/lib/schedule";

// ---------------------------------------------------------------------------
// Pressupostos e escalões de IRS. As tabelas de 2026 (Continente/Açores/
// Madeira × Tabelas I/II/III) são as oficiais, importadas de
// src/lib/irs-tables-2026-seed.ts; para outros anos sem tabela carregada,
// cai-se num escalão único simplificado só para nunca ficar sem retenção
// calculada — RH deve carregar a tabela oficial desse ano em
// /payroll/pressupostos.
// ---------------------------------------------------------------------------

const DEFAULT_IRS_BRACKETS = [
  { order: 1, upToGross: 870, rate: 0, deduction: 0, deductionCoefficient: null, deductionThreshold: null, dependentAddition: 0 },
  { order: 2, upToGross: 1000, rate: 0.13, deduction: 0, deductionCoefficient: null, deductionThreshold: null, dependentAddition: 0 },
  { order: 3, upToGross: 1300, rate: 0.165, deduction: 0, deductionCoefficient: null, deductionThreshold: null, dependentAddition: 0 },
  { order: 4, upToGross: 1800, rate: 0.21, deduction: 0, deductionCoefficient: null, deductionThreshold: null, dependentAddition: 0 },
  { order: 5, upToGross: 2500, rate: 0.26, deduction: 0, deductionCoefficient: null, deductionThreshold: null, dependentAddition: 0 },
  { order: 6, upToGross: 3500, rate: 0.32, deduction: 0, deductionCoefficient: null, deductionThreshold: null, dependentAddition: 0 },
  { order: 7, upToGross: 5000, rate: 0.37, deduction: 0, deductionCoefficient: null, deductionThreshold: null, dependentAddition: 0 },
  { order: 8, upToGross: null, rate: 0.45, deduction: 0, deductionCoefficient: null, deductionThreshold: null, dependentAddition: 0 },
];

export async function getPayrollSettings() {
  const existing = await prisma.payrollSettings.findFirst();
  if (existing) return existing;
  return prisma.payrollSettings.create({ data: {} });
}

// Categoria de uma rubrica variável (PayrollComponent) — a forma amigável
// de escolher a combinação taxable/ssApplicable já existente no modelo,
// tal como pedido: rendimentos sujeitos a IRS e SS, só a IRS, ou isentos
// de ambos (ex.: outros benefícios isentos, como seguro de saúde).
export const PAYROLL_COMPONENT_CATEGORIES = ["TAXABLE_SS", "TAXABLE_ONLY", "EXEMPT"] as const;
export type PayrollComponentCategory = (typeof PAYROLL_COMPONENT_CATEGORIES)[number];
export const PAYROLL_COMPONENT_CATEGORY_LABELS: Record<PayrollComponentCategory, string> = {
  TAXABLE_SS: "Sujeito a IRS e Segurança Social",
  TAXABLE_ONLY: "Sujeito só a IRS",
  EXEMPT: "Isento (IRS e Segurança Social)",
};
export function categoryToTaxFlags(category: PayrollComponentCategory): { taxable: boolean; ssApplicable: boolean } {
  switch (category) {
    case "TAXABLE_SS":
      return { taxable: true, ssApplicable: true };
    case "TAXABLE_ONLY":
      return { taxable: true, ssApplicable: false };
    case "EXEMPT":
      return { taxable: false, ssApplicable: false };
  }
}
export function taxFlagsToCategory(taxable: boolean, ssApplicable: boolean): PayrollComponentCategory {
  if (!taxable) return "EXEMPT";
  return ssApplicable ? "TAXABLE_SS" : "TAXABLE_ONLY";
}

export const FISCAL_REGIONS = ["CONTINENTE", "ACORES", "MADEIRA"] as const;
export const FISCAL_REGION_LABELS: Record<string, string> = {
  CONTINENTE: "Continente",
  ACORES: "Açores",
  MADEIRA: "Madeira",
};

export const IRS_TABLE_TYPES = ["I", "II", "III"] as const;
export type IrsTableType = (typeof IRS_TABLE_TYPES)[number];
export const IRS_TABLE_TYPE_LABELS: Record<IrsTableType, string> = {
  I: "Tabela I — não casado sem dependentes / casado dois titulares",
  II: "Tabela II — não casado com dependentes",
  III: "Tabela III — casado único titular",
};

export type IrsSeedBracket = {
  order: number;
  upToGross: number | null;
  rate: number;
  deduction: number | null;
  deductionCoefficient: number | null;
  deductionThreshold: number | null;
  dependentAddition: number;
};

export type IrsSeedTable = {
  year: number;
  region: string;
  tableType: IrsTableType;
  label: string;
  brackets: IrsSeedBracket[];
};

// Qual das 3 tabelas de retenção se aplica — a mesma lógica das tabelas
// oficiais da Autoridade Tributária: Tabela I para quem não tem
// dependentes (ou é casado com dois titulares, exceto nos Açores sem
// dependentes, onde também cai na I); Tabela II para não casado com
// dependentes; Tabela III (casado único titular) cobre o resto.
export function determineIrsTableType(
  maritalStatus: string | null,
  dependents: number,
  region: string
): IrsTableType {
  const isSingleTitulant = maritalStatus === "CASADO_UNICO_TITULAR";
  const isDualTitulant = maritalStatus === "CASADO_DOIS_TITULARES";
  const isAcores = region === "ACORES";

  const isTableI =
    (dependents === 0 && !isSingleTitulant && !isDualTitulant) ||
    (isDualTitulant && !isAcores) ||
    (isDualTitulant && dependents === 0 && isAcores);
  if (isTableI) return "I";

  const isTableII = dependents > 0 && !isSingleTitulant && !isDualTitulant;
  if (isTableII) return "II";

  return "III";
}

export async function getIrsTables() {
  return prisma.irsTable.findMany({
    include: { brackets: { orderBy: { order: "asc" } } },
    orderBy: [{ year: "desc" }, { region: "asc" }, { tableType: "asc" }],
  });
}

async function seedIrsTablesForYear(year: number) {
  if (year !== 2026) return [] as Awaited<ReturnType<typeof getIrsTables>>;
  const { IRS_TABLES_2026 } = await import("./irs-tables-2026-seed");
  const created = [];
  for (const t of IRS_TABLES_2026) {
    created.push(
      await prisma.irsTable.create({
        data: {
          year: t.year,
          region: t.region,
          tableType: t.tableType,
          label: t.label,
          brackets: { createMany: { data: t.brackets } },
        },
        include: { brackets: { orderBy: { order: "asc" } } },
      })
    );
  }
  return created;
}

// Escolhe a tabela de IRS a aplicar a um recibo: a combinação exata
// ano+mês+região+tabela se existir (Portugal pode ter mais do que uma
// tabela no mesmo ano, cada uma com o seu intervalo de meses); caso
// contrário cai sucessivamente para Continente do mesmo ano+mês+tabela,
// depois para qualquer tabela desse ano+região/Continente (ignorando o
// mês, caso só exista uma tabela carregada nesse ano), depois para a mais
// recente disponível de anos anteriores, e por fim para a mais antiga de
// todas — nunca fica sem retenção calculada. Para 2026 sem nenhuma tabela
// ainda carregada, semeia as 9 tabelas oficiais (ver
// irs-tables-2026-seed.ts); para outros anos sem nada carregado, cai num
// escalão único simplificado.
export async function getIrsBracketsFor(year: number, month: number, region: string, tableType: IrsTableType) {
  let tables = await getIrsTables();

  if (tables.length === 0 && year === 2026) {
    tables = await seedIrsTablesForYear(2026);
  }

  if (tables.length === 0) {
    const seeded = await prisma.irsTable.create({
      data: {
        year,
        region: "CONTINENTE",
        tableType: "I",
        label: "Tabela por omissão (simplificada)",
        brackets: { createMany: { data: DEFAULT_IRS_BRACKETS } },
      },
      include: { brackets: { orderBy: { order: "asc" } } },
    });
    return seeded.brackets;
  }

  const inMonth = (t: (typeof tables)[number]) => t.monthFrom <= month && month <= t.monthTo;

  const exact = tables.find((t) => t.year === year && t.region === region && t.tableType === tableType && inMonth(t));
  if (exact) return exact.brackets;

  const sameYearContinente = tables.find(
    (t) => t.year === year && t.region === "CONTINENTE" && t.tableType === tableType && inMonth(t)
  );
  if (sameYearContinente) return sameYearContinente.brackets;

  const sameYearAnyMonth = tables.find((t) => t.year === year && t.region === region && t.tableType === tableType);
  if (sameYearAnyMonth) return sameYearAnyMonth.brackets;

  const sameYearContinenteAnyMonth = tables.find(
    (t) => t.year === year && t.region === "CONTINENTE" && t.tableType === tableType
  );
  if (sameYearContinenteAnyMonth) return sameYearContinenteAnyMonth.brackets;

  const candidatesForRegion = tables
    .filter((t) => t.region === region && t.tableType === tableType && t.year <= year)
    .sort((a, b) => b.year - a.year);
  if (candidatesForRegion[0]) return candidatesForRegion[0].brackets;

  const candidatesContinente = tables
    .filter((t) => t.region === "CONTINENTE" && t.tableType === tableType && t.year <= year)
    .sort((a, b) => b.year - a.year);
  if (candidatesContinente[0]) return candidatesContinente[0].brackets;

  // Nenhuma tabela igual ou anterior ao ano pedido, para esta tabela —
  // usa a mais antiga disponível (qualquer tabela/região), para nunca
  // ficar sem retenção nenhuma calculada.
  const oldestFirst = [...tables].sort((a, b) => a.year - b.year);
  return oldestFirst[0].brackets;
}

export type IrsBracketRow = {
  upToGross: number | null;
  rate: number;
  deduction: number | null;
  deductionCoefficient: number | null;
  deductionThreshold: number | null;
  dependentAddition: number;
};

// Fórmula oficial de retenção na fonte: encontra o escalão em que o
// rendimento tributável se enquadra e aplica a taxa marginal máxima a TODO
// o rendimento (não é uma soma progressiva por escalão), descontando a
// parcela a abater (fixa, ou calculada dinamicamente nos escalões mais
// baixos: taxa × coeficiente × (limiar - rendimento)) e o acréscimo por
// dependente multiplicado pelo nº de dependentes.
export function computeIrsFlatRate(taxableGross: number, dependents: number, brackets: IrsBracketRow[]): number {
  if (taxableGross <= 0 || brackets.length === 0) return 0;

  const sorted = [...brackets].sort((a, b) => (a.upToGross ?? Infinity) - (b.upToGross ?? Infinity));
  const bracket = sorted.find((b) => taxableGross < (b.upToGross ?? Infinity)) ?? sorted[sorted.length - 1];

  const deduction =
    bracket.deductionCoefficient != null && bracket.deductionThreshold != null
      ? bracket.rate * bracket.deductionCoefficient * (bracket.deductionThreshold - taxableGross)
      : (bracket.deduction ?? 0);

  const tax = taxableGross * bracket.rate - deduction - dependents * bracket.dependentAddition;
  return Math.max(0, tax);
}

export async function getFiscalYearConstants(year: number) {
  const existing = await prisma.fiscalYearConstants.findUnique({ where: { year } });
  if (existing) return existing;

  if (year === 2026) {
    const { FISCAL_YEAR_CONSTANTS_2026 } = await import("./irs-tables-2026-seed");
    return prisma.fiscalYearConstants.create({ data: FISCAL_YEAR_CONSTANTS_2026 });
  }

  // Sem constantes carregadas para o ano pedido — usa as mais recentes
  // disponíveis (até ao ano pedido) ou, na sua falta, os valores por
  // omissão do modelo (ver schema.prisma).
  const candidates = await prisma.fiscalYearConstants.findMany({ orderBy: { year: "desc" } });
  const sameOrEarlier = candidates.find((c) => c.year <= year);
  if (sameOrEarlier) return sameOrEarlier;
  if (candidates[0]) return candidates[0];

  return prisma.fiscalYearConstants.create({ data: { year, ias: 509.26 } });
}

// Tabela oficial do IRS Jovem (art.º 12.º-B do CIRS, regime em vigor desde
// 2025): 1.º ano 100%, 2.º-4.º 75%, 5.º-7.º 50%, 8.º-10.º 25%. Exportada
// também para pré-visualização no formulário — a AT pode publicar valores
// específicos por ano em IrsYoungExemption, usados em vez deste default.
export const DEFAULT_YOUNG_EXEMPTION_BY_YEAR_OF_BENEFIT: Record<number, number> = {
  1: 1.0,
  2: 0.75,
  3: 0.75,
  4: 0.75,
  5: 0.5,
  6: 0.5,
  7: 0.5,
  8: 0.25,
  9: 0.25,
  10: 0.25,
};

export async function getIrsYoungExemptionPercent(year: number, yearOfBenefit: number): Promise<number> {
  const clamped = Math.min(10, Math.max(1, yearOfBenefit));
  const exact = await prisma.irsYoungExemption.findUnique({
    where: { year_yearOfBenefit: { year, yearOfBenefit: clamped } },
  });
  if (exact) return exact.exemptionPercent;

  if (year === 2026) {
    const { IRS_YOUNG_EXEMPTION_2026 } = await import("./irs-tables-2026-seed");
    await prisma.irsYoungExemption.createMany({
      data: IRS_YOUNG_EXEMPTION_2026.map((e) => ({ year: 2026, ...e })),
      skipDuplicates: true,
    });
    const seeded = IRS_YOUNG_EXEMPTION_2026.find((e) => e.yearOfBenefit === clamped);
    if (seeded) return seeded.exemptionPercent;
  }

  return DEFAULT_YOUNG_EXEMPTION_BY_YEAR_OF_BENEFIT[clamped] ?? 0.25;
}

// Regime do IRS Jovem: aplica uma isenção (percentagem decrescente por
// "ano de rendimentos" desde o início do regime) sobre um teto anual —
// equivalente ao que o simulador oficial faz: se a isenção plena exceder o
// teto, só a parte acima do teto é tributada à taxa normal; caso
// contrário, tributa-se a fração (1 - isenção) à taxa normal.
export function applyYoungTaxExemption(
  normalTax: number,
  taxableAmount: number,
  exemptionPercent: number,
  capAmount: number
): number {
  if (taxableAmount <= 0) return 0;
  const exemptAmount = exemptionPercent * taxableAmount;
  if (exemptAmount > capAmount) {
    return Math.max(0, ((taxableAmount - capAmount) / taxableAmount) * normalTax);
  }
  return Math.max(0, (1 - exemptionPercent) * normalTax);
}

export type PayslipComponentSnapshot = {
  name: string;
  type: "EARNING" | "DEDUCTION";
  amount: number;
  category: PayrollComponentCategory;
};

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
  components: PayslipComponentSnapshot[];
  vacationSubsidy: number;
  christmasSubsidy: number;
  grossTaxable: number;
  grossTotal: number;
  socialSecurityEmployee: number;
  irsWithholding: number;
  adseDeduction: number;
  judicialDeduction: number;
  netTotal: number;
  socialSecurityEmployer: number;
  employerCost: number;
  belowMinimumWage: boolean;
  workedDays: number;
};

// Resolve o modo de pagamento do subsídio de férias/Natal: usa a
// personalização do colaborador quando definida, caso contrário a
// definição global de PayrollSettings (convertida para a mesma forma —
// duodécimos, ou meses concretos, por omissão o mês tradicional do
// subsídio em causa).
function resolveSubsidyPlan(
  employeeMode: string | null,
  employeeMonths: string | null,
  globalMode: string,
  defaultMonth: number
): { mode: "DUODECIMOS" | "MONTHS"; months: number[] } {
  if (employeeMode === "DUODECIMOS") return { mode: "DUODECIMOS", months: [] };
  if (employeeMode === "MONTHS") {
    const months = (employeeMonths ?? "")
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => n >= 1 && n <= 12);
    return { mode: "MONTHS", months: months.length ? months : [defaultMonth] };
  }
  if (globalMode === "MONTHLY_DUODECIMOS") return { mode: "DUODECIMOS", months: [] };
  return { mode: "MONTHS", months: [defaultMonth] };
}

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
  const tableType = determineIrsTableType(employee.maritalStatus, employee.dependents, employee.fiscalRegion);
  const [irsBrackets, fiscalConstants] = await Promise.all([
    getIrsBracketsFor(year, month, employee.fiscalRegion, tableType),
    getFiscalYearConstants(year),
  ]);

  const contract = employee.employeeContracts[0];
  const baseSalary = employee.baseSalary ?? 0;
  const contractedWeeklyHours = contract?.contractProfile.weeklyHours ?? employee.weeklyHours;

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const [entries, absencesWithImpact, components, hoursCorrections, dayDecisions] = await Promise.all([
    prisma.timeClockEntry.findMany({
      where: { employeeId, timestamp: { gte: periodStart, lte: periodEnd } },
      orderBy: { timestamp: "asc" },
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
    // Decisões do gestor de RH sobre desvios de picagens (Picagens →
    // Execução): só um dia com decisão "OVERTIME" entra como hora extra, e
    // só um dia "DEDUCTION" desconta — um desvio por decidir, ou decidido
    // como bolsa de horas/justificado, não mexe no recibo.
    prisma.timeClockDayDecision.findMany({
      where: {
        employeeId,
        date: { gte: periodStart, lte: periodEnd },
        decisionType: { in: ["OVERTIME", "DEDUCTION"] },
      },
    }),
  ]);

  // Turnos escalados no período — usados para traduzir cada dia de
  // ausência nas horas que estavam previstas (e não numa diária fixa),
  // tal como pedido: "desconto por absentismo... % do valor hora".
  const shiftsInPeriod = await prisma.shift.findMany({
    where: { employeeId, date: { gte: periodStart, lte: periodEnd } },
    include: { shiftTemplate: { select: { breakMins: true } } },
  });
  const shiftHoursByDay = new Map<string, number>();
  for (const s of shiftsInPeriod) {
    const hours = shiftDurationHours(s.startTime, s.endTime, s.shiftTemplate?.breakMins ?? 0);
    shiftHoursByDay.set(isoDate(s.date), (shiftHoursByDay.get(isoDate(s.date)) ?? 0) + hours);
  }

  const workedByDay = computeWorkedHoursByDay(entries);

  // Correções manuais de picagens/execução (Picagens → Execução) têm de se
  // refletir no recibo — cada uma guarda o desvio (minutos) face ao valor
  // em bruto para um dia e lado (ACTUAL = horas reais, SCHEDULED = horário
  // previsto), tal como já é aplicado na grelha de execução.
  const actualCorrMinByDay = new Map<string, number>();
  for (const c of hoursCorrections) {
    if (c.field === "ACTUAL") actualCorrMinByDay.set(isoDate(c.date), c.minutesDelta);
  }

  // Decisões do gestor de RH sobre o desvio de cada dia (ver Picagens →
  // Execução): diffMinutes já é o desvio (real - previsto, com correções
  // incluídas) tirado "em retrato" no momento da decisão.
  const decisionByDay = new Map(dayDecisions.map((d) => [isoDate(d.date), d]));

  let workedHours = 0;
  let overtimeHours = 0;
  let overtimePay = 0;
  let workedDays = 0;
  let unjustifiedDeductionHours = 0;
  const regularHourRate = contractedWeeklyHours > 0 ? (baseSalary / (contractedWeeklyHours * (52 / 12))) : 0;

  const dayKeys = new Set<string>([...workedByDay.keys(), ...actualCorrMinByDay.keys()]);
  for (const dayIso of dayKeys) {
    const rawHours = workedByDay.get(dayIso) ?? 0;
    const hoursWorked = Math.max(0, rawHours + (actualCorrMinByDay.get(dayIso) ?? 0) / 60);
    if (hoursWorked === 0) continue;

    workedHours += hoursWorked;
    workedDays++;
    const date = new Date(dayIso + "T12:00:00");

    // Horas extra e descontos por picagens só entram no recibo quando o
    // gestor de RH decidiu explicitamente o desvio desse dia — um desvio
    // por decidir, posto na bolsa de horas, ou justificado por uma
    // ausência, não altera o salário.
    const decision = decisionByDay.get(dayIso);
    if (decision?.decisionType === "OVERTIME") {
      const overtimeForDay = Math.max(0, decision.diffMinutes / 60);
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
    } else if (decision?.decisionType === "DEDUCTION") {
      unjustifiedDeductionHours += Math.abs(decision.diffMinutes) / 60;
    }
  }

  // Cada dia de ausência com impacto salarial < 100% desconta a fração
  // correspondente às horas que estavam escaladas nesse dia (não uma
  // diária fixa) — se não houver turno escalado nesse dia, cai numa média
  // (horas semanais contratuais / 5) para nunca ficar sem desconto.
  const averageDayHours = contractedWeeklyHours > 0 ? contractedWeeklyHours / 5 : 0;
  let absenceDeductionDays = 0;
  let absenceDeduction = 0;
  for (const absence of absencesWithImpact) {
    const unpaidFraction = 1 - absence.absenceType.salaryImpactPercent / 100;
    const from = absence.startDate > periodStart ? absence.startDate : periodStart;
    const to = absence.endDate < periodEnd ? absence.endDate : periodEnd;
    for (let d = new Date(from); d <= to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const dayIso = isoDate(d);
      const scheduledHours = shiftHoursByDay.get(dayIso) ?? averageDayHours;
      absenceDeductionDays += unpaidFraction;
      absenceDeduction += unpaidFraction * scheduledHours * regularHourRate;
    }
  }

  // O subsídio de alimentação conta os dias a partir do nº de dias
  // trabalhado em escala (turnos escalados no período) — só cai para os
  // dias com picagem (workedDays) quando não há nenhum turno escalado,
  // para não ficar a 0€ só por faltarem dados de escala.
  const mealAllowanceDays = shiftHoursByDay.size > 0 ? shiftHoursByDay.size : workedDays;
  const mealAllowanceDaily = settings.mealAllowanceDaily;
  const mealAllowanceTotal = mealAllowanceDays * mealAllowanceDaily;
  const mealAllowanceExemptCapDaily =
    settings.mealAllowancePaymentMethod === "CASH"
      ? fiscalConstants.mealAllowanceExemptCashDaily
      : fiscalConstants.mealAllowanceExemptCardDaily;
  const mealAllowanceExempt = Math.min(mealAllowanceTotal, mealAllowanceDays * mealAllowanceExemptCapDaily);
  const mealAllowanceTaxable = mealAllowanceTotal - mealAllowanceExempt;

  // Rendimentos variáveis por colaborador, nas 3 categorias pedidas: suj.
  // a IRS e SS, suj. só a IRS, e isentos (de ambos) — cada rubrica já guarda
  // isto em `taxable`/`ssApplicable`.
  const earningComponents = components.filter((c) => c.type === "EARNING");
  const deductionComponents = components.filter((c) => c.type === "DEDUCTION");
  const earningsTaxableAndSS = earningComponents
    .filter((c) => c.taxable && c.ssApplicable)
    .reduce((sum, c) => sum + c.amount, 0);
  const earningsTaxableOnly = earningComponents
    .filter((c) => c.taxable && !c.ssApplicable)
    .reduce((sum, c) => sum + c.amount, 0);
  const earningsExempt = earningComponents.filter((c) => !c.taxable).reduce((sum, c) => sum + c.amount, 0);
  const otherEarnings = earningsTaxableAndSS + earningsTaxableOnly + earningsExempt;
  const unjustifiedDeductionAmount = unjustifiedDeductionHours * regularHourRate;
  // Inclui o desconto por desvios de picagens injustificados (>1h, decisão
  // "DEDUCTION" do gestor de RH em Picagens → Execução) junto dos restantes
  // descontos pontuais/recorrentes.
  const otherDeductions = deductionComponents.reduce((sum, c) => sum + c.amount, 0) + unjustifiedDeductionAmount;

  // Cada rubrica entra no recibo com o seu próprio nome (em vez de um
  // "Outros vencimentos/descontos" agregado) — guardado em
  // Payslip.componentsJson para o recibo continuar a mostrar cada rubrica
  // mesmo que a PayrollComponent de origem seja depois editada ou apagada.
  const componentSnapshots: PayslipComponentSnapshot[] = components.map((c) => ({
    name: c.name,
    type: c.type as "EARNING" | "DEDUCTION",
    amount: c.amount,
    category: taxFlagsToCategory(c.taxable, c.ssApplicable),
  }));
  if (unjustifiedDeductionAmount > 0) {
    componentSnapshots.push({
      name: "Desconto por desvios de picagens",
      type: "DEDUCTION",
      amount: unjustifiedDeductionAmount,
      category: "TAXABLE_SS",
    });
  }

  const vacationPlan = resolveSubsidyPlan(
    employee.vacationSubsidyMode,
    employee.vacationSubsidyMonths,
    settings.vacationSubsidyMode,
    6
  );
  const christmasPlan = resolveSubsidyPlan(
    employee.christmasSubsidyMode,
    employee.christmasSubsidyMonths,
    settings.christmasSubsidyMode,
    12
  );
  const duodecimosVacation = vacationPlan.mode === "DUODECIMOS" ? baseSalary / 12 : 0;
  const lumpSumVacation =
    vacationPlan.mode === "MONTHS" && vacationPlan.months.includes(month)
      ? baseSalary / vacationPlan.months.length
      : 0;
  const duodecimosChristmas = christmasPlan.mode === "DUODECIMOS" ? baseSalary / 12 : 0;
  const lumpSumChristmas =
    christmasPlan.mode === "MONTHS" && christmasPlan.months.includes(month)
      ? baseSalary / christmasPlan.months.length
      : 0;
  const vacationSubsidy = duodecimosVacation + lumpSumVacation;
  const christmasSubsidy = duodecimosChristmas + lumpSumChristmas;
  const duodecimosAmount = duodecimosVacation + duodecimosChristmas;
  // Subsídios pagos de uma vez (não em duodécimos) são tributados à parte,
  // com a tabela de IRS aplicada só ao próprio valor — tal como a AT exige
  // para "retribuições extraordinárias" (ex.: o 13º/14º mês de uma vez).
  const lumpSumAmount = lumpSumVacation + lumpSumChristmas;

  const ordinaryIrsBase = Math.max(
    0,
    baseSalary -
      absenceDeduction +
      overtimePay +
      mealAllowanceTaxable +
      earningsTaxableAndSS +
      earningsTaxableOnly +
      duodecimosAmount
  );
  const ordinarySsBase = Math.max(
    0,
    baseSalary - absenceDeduction + overtimePay + mealAllowanceTaxable + earningsTaxableAndSS + duodecimosAmount
  );
  const extraIrsBase = Math.max(0, lumpSumAmount);
  const extraSsBase = extraIrsBase;

  let irsOrdinary = computeIrsFlatRate(ordinaryIrsBase, employee.dependents, irsBrackets);
  let irsExtra = extraIrsBase > 0 ? computeIrsFlatRate(extraIrsBase, employee.dependents, irsBrackets) : 0;

  // IRS Jovem — isenção decrescente por "ano de rendimentos" desde o
  // início do regime, aplicada separadamente ao rendimento ordinário e ao
  // extraordinário (mesmo mecanismo do simulador oficial).
  if (employee.youngTaxRegime && employee.youngTaxRegimeStartYear) {
    const yearOfBenefit = year - employee.youngTaxRegimeStartYear + 1;
    if (yearOfBenefit >= 1 && yearOfBenefit <= 10) {
      const exemptionPercent = await getIrsYoungExemptionPercent(year, yearOfBenefit);
      const cap =
        (fiscalConstants.youngExemptionCapAnnualMultiplier * fiscalConstants.ias) /
        fiscalConstants.youngExemptionCapPaymentsPerYear;
      irsOrdinary = applyYoungTaxExemption(irsOrdinary, ordinaryIrsBase, exemptionPercent, cap);
      if (extraIrsBase > 0) {
        irsExtra = applyYoungTaxExemption(irsExtra, extraIrsBase, exemptionPercent, cap);
      }
    }
  }
  const irsWithholding = irsOrdinary + irsExtra;

  const socialSecurityEmployee = (ordinarySsBase + extraSsBase) * settings.socialSecurityEmployeeRate;
  const adseDeduction = employee.adseBeneficiary ? baseSalary * settings.adseEmployeeRate : 0;

  const grossTaxable = ordinaryIrsBase + extraIrsBase;
  const grossTotal = grossTaxable + mealAllowanceExempt + earningsExempt;
  const netBeforeJudicial = grossTotal - socialSecurityEmployee - irsWithholding - otherDeductions - adseDeduction;
  const judicialDeduction =
    employee.judicialDeductionPercent && netBeforeJudicial > 0
      ? netBeforeJudicial * (employee.judicialDeductionPercent / 100)
      : 0;
  const netTotal = netBeforeJudicial - judicialDeduction;

  const socialSecurityEmployer = (ordinarySsBase + extraSsBase) * settings.socialSecurityEmployerRate;
  const employerCost =
    grossTotal + socialSecurityEmployer + (ordinarySsBase + extraSsBase) * settings.workAccidentInsuranceRate;

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
    components: componentSnapshots,
    vacationSubsidy,
    christmasSubsidy,
    grossTaxable,
    grossTotal,
    socialSecurityEmployee,
    irsWithholding,
    adseDeduction,
    judicialDeduction,
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
    componentsJson: JSON.stringify(b.components),
    vacationSubsidy: b.vacationSubsidy,
    christmasSubsidy: b.christmasSubsidy,
    grossTotal: b.grossTotal,
    socialSecurityEmployee: b.socialSecurityEmployee,
    irsWithholding: b.irsWithholding,
    adseDeduction: b.adseDeduction,
    judicialDeduction: b.judicialDeduction,
    netTotal: b.netTotal,
    socialSecurityEmployer: b.socialSecurityEmployer,
    employerCost: b.employerCost,
    belowMinimumWage: b.belowMinimumWage,
  };
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
  | "adseDeduction"
  | "judicialDeduction"
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
  { key: "irsWithholding", label: "IRS — retenção na fonte", section: "DEDUCTIONS", visible: true },
  { key: "adseDeduction", label: "ADSE", section: "DEDUCTIONS", visible: true },
  { key: "judicialDeduction", label: "Desconto judicial", section: "DEDUCTIONS", visible: true },
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
  adseDeduction: number;
  judicialDeduction: number;
  otherDeductions: number;
  componentsJson?: string | null;
};

function parsePayslipComponents(json: string | null | undefined): PayslipComponentSnapshot[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
    case "adseDeduction":
      return { value: -source.adseDeduction, suffix: "" };
    case "judicialDeduction":
      return { value: -source.judicialDeduction, suffix: "" };
    case "otherDeductions":
      return { value: -source.otherDeductions, suffix: "" };
  }
}

// Aplica o layout configurado (ordem, texto e visibilidade) aos valores
// calculados de um recibo — usado tanto na pré-visualização no ecrã como
// no PDF, para que os dois mostrem sempre exatamente as mesmas linhas.
// `includeZero` ignora o filtro de "só mostra se tiver valor" — usado na
// exportação Excel por período, onde todas as colunas têm de aparecer em
// todas as linhas (mesmo a 0€) para a tabela ficar tabular.
export function buildPayslipLines(
  source: PayslipLineSource,
  lineItems: PayslipLineItemConfig[],
  includeZero = false,
  itemizeComponents = false
): PayslipLine[] {
  const components = itemizeComponents ? parsePayslipComponents(source.componentsJson) : [];
  const lines: PayslipLine[] = [];
  for (const item of lineItems) {
    if (!item.visible) continue;

    if (item.key === "otherEarnings" && components.length > 0) {
      for (const c of components.filter((c) => c.type === "EARNING")) {
        lines.push({ key: item.key, label: c.name, section: item.section, value: c.amount });
      }
      continue;
    }
    if (item.key === "otherDeductions" && components.length > 0) {
      for (const c of components.filter((c) => c.type === "DEDUCTION")) {
        lines.push({ key: item.key, label: c.name, section: item.section, value: -c.amount });
      }
      continue;
    }

    const { value, suffix } = payslipLineValue(source, item.key);
    if (!includeZero && !ALWAYS_SHOW_LINE_ITEMS.has(item.key) && value === 0) continue;
    lines.push({ key: item.key, label: item.label + suffix, section: item.section, value });
  }
  return lines;
}
