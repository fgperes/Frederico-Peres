"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import {
  computePayslipBreakdown,
  getPayrollSettings,
  toPayslipRecord,
  FISCAL_REGIONS,
  DEFAULT_PAYSLIP_LINE_ITEMS,
  IRS_TABLE_TYPES,
  categoryToTaxFlags,
  getPayslipLayoutSettings,
  buildPayslipLines,
  type PayslipLineItemKey,
  type IrsTableType,
  type PayrollComponentCategory,
} from "@/lib/payroll";
import { getDocumentBranding } from "@/lib/document-branding";
import { revalidatePath } from "next/cache";
import { parseExcelFile } from "@/lib/excel";

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "payroll")) {
    throw new Error("Sem permissão para editar dados de payroll.");
  }
  return user;
}

export type PayrollSettingsFormState = { error?: string };

// Pressupostos (taxas, salário mínimo, valores de subsídios) — só Admin/RH.
export async function updatePayrollSettings(
  _prev: PayrollSettingsFormState,
  formData: FormData
): Promise<PayrollSettingsFormState> {
  try {
  const user = await assertCanWrite();

  const minimumWage = Number(formData.get("minimumWage"));
  const socialSecurityEmployeeRate = Number(formData.get("socialSecurityEmployeeRate"));
  const socialSecurityEmployerRate = Number(formData.get("socialSecurityEmployerRate"));
  const workAccidentInsuranceRate = Number(formData.get("workAccidentInsuranceRate"));
  const mealAllowanceDaily = Number(formData.get("mealAllowanceDaily"));
  const overtimeRateFirstHour = Number(formData.get("overtimeRateFirstHour"));
  const overtimeRateAdditional = Number(formData.get("overtimeRateAdditional"));
  const overtimeRateWeekendHoliday = Number(formData.get("overtimeRateWeekendHoliday"));
  const workingDaysPerMonth = Number(formData.get("workingDaysPerMonth"));
  const vacationSubsidyMode = String(formData.get("vacationSubsidyMode"));
  const christmasSubsidyMode = String(formData.get("christmasSubsidyMode"));
  const mealAllowancePaymentMethod = String(formData.get("mealAllowancePaymentMethod") ?? "CARD");
  const adseEmployeeRate = Number(formData.get("adseEmployeeRate"));

  // Validações básicas de acordo com a legislação portuguesa (Código do
  // Trabalho): taxas têm de ser percentagens válidas, salário mínimo e
  // subsídios não podem ser negativos, os multiplicadores de horas extra
  // não podem ser inferiores a 1x (não pode pagar-se abaixo da hora normal).
  const errors: string[] = [];
  if (!(minimumWage > 0)) errors.push("Salário mínimo tem de ser superior a 0.");
  if (!(socialSecurityEmployeeRate >= 0 && socialSecurityEmployeeRate < 1))
    errors.push("Taxa de SS do trabalhador tem de estar entre 0% e 100%.");
  if (!(socialSecurityEmployerRate >= 0 && socialSecurityEmployerRate < 1))
    errors.push("Taxa de SS da entidade patronal tem de estar entre 0% e 100%.");
  if (!(workAccidentInsuranceRate >= 0 && workAccidentInsuranceRate < 1))
    errors.push("Taxa de seguro de acidentes de trabalho inválida.");
  if (mealAllowanceDaily < 0) errors.push("Subsídio de alimentação não pode ser negativo.");
  if (overtimeRateFirstHour < 1) errors.push("Acréscimo da 1ª hora extra não pode ser inferior a 1x (Art. 268º CT).");
  if (overtimeRateAdditional < 1) errors.push("Acréscimo das horas extra seguintes não pode ser inferior a 1x.");
  if (overtimeRateWeekendHoliday < 1) errors.push("Acréscimo de fim de semana/feriado não pode ser inferior a 1x.");
  if (!(workingDaysPerMonth > 0 && workingDaysPerMonth <= 31))
    errors.push("Dias úteis por mês inválido.");
  if (!(adseEmployeeRate >= 0 && adseEmployeeRate < 1)) errors.push("Taxa ADSE do trabalhador inválida.");
  if (!["CARD", "CASH"].includes(mealAllowancePaymentMethod))
    errors.push("Forma de pagamento do subsídio de alimentação inválida.");

  if (errors.length > 0) throw new Error(errors.join(" "));

  const existing = await prisma.payrollSettings.findFirst();
  const data = {
    minimumWage,
    socialSecurityEmployeeRate,
    socialSecurityEmployerRate,
    workAccidentInsuranceRate,
    mealAllowanceDaily,
    overtimeRateFirstHour,
    overtimeRateAdditional,
    overtimeRateWeekendHoliday,
    workingDaysPerMonth,
    vacationSubsidyMode,
    christmasSubsidyMode,
    mealAllowancePaymentMethod,
    adseEmployeeRate,
    updatedById: user.id,
  };

  if (existing) {
    await prisma.payrollSettings.update({ where: { id: existing.id }, data });
  } else {
    await prisma.payrollSettings.create({ data });
  }

  await logAudit({ userId: user.id, action: "UPDATE", entity: "PayrollSettings", details: "Pressupostos de payroll atualizados" });
  revalidatePath("/payroll/pressupostos");
  revalidatePath("/payroll");
  return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível guardar os pressupostos." };
  }
}

export type FiscalYearConstantsFormState = { error?: string };

// Limites de isenção fiscal por ano — subsídio de alimentação (isento até
// um valor/dia, diferente entre cartão refeição e numerário/transferência)
// e o teto da isenção do IRS Jovem. É o único sítio onde estes valores se
// definem — o colaborador só escolhe a forma de pagamento (Pressupostos
// Gerais) e o recibo aplica automaticamente o limite do ano em que é gerado.
export async function updateFiscalYearConstants(
  _prev: FiscalYearConstantsFormState,
  formData: FormData
): Promise<FiscalYearConstantsFormState> {
  try {
    const user = await assertCanWrite();

    const year = Number(formData.get("year"));
    const ias = Number(formData.get("ias"));
    const mealAllowanceExemptCardDaily = Number(formData.get("mealAllowanceExemptCardDaily"));
    const mealAllowanceExemptCashDaily = Number(formData.get("mealAllowanceExemptCashDaily"));
    const youngExemptionCapAnnualMultiplier = Number(formData.get("youngExemptionCapAnnualMultiplier"));
    const youngExemptionCapPaymentsPerYear = Number(formData.get("youngExemptionCapPaymentsPerYear"));

    const errors: string[] = [];
    if (!(year >= 2000 && year <= 2100)) errors.push("Ano inválido.");
    if (!(ias > 0)) errors.push("IAS tem de ser superior a 0.");
    if (mealAllowanceExemptCardDaily < 0) errors.push("Limite isento (cartão) não pode ser negativo.");
    if (mealAllowanceExemptCashDaily < 0) errors.push("Limite isento (numerário) não pode ser negativo.");
    if (!(youngExemptionCapAnnualMultiplier > 0)) errors.push("Multiplicador do teto do IRS Jovem inválido.");
    if (!(youngExemptionCapPaymentsPerYear > 0)) errors.push("Nº de pagamentos/ano do teto do IRS Jovem inválido.");
    if (errors.length > 0) throw new Error(errors.join(" "));

    await prisma.fiscalYearConstants.upsert({
      where: { year },
      update: {
        ias,
        mealAllowanceExemptCardDaily,
        mealAllowanceExemptCashDaily,
        youngExemptionCapAnnualMultiplier,
        youngExemptionCapPaymentsPerYear,
      },
      create: {
        year,
        ias,
        mealAllowanceExemptCardDaily,
        mealAllowanceExemptCashDaily,
        youngExemptionCapAnnualMultiplier,
        youngExemptionCapPaymentsPerYear,
      },
    });

    await logAudit({ userId: user.id, action: "UPDATE", entity: "FiscalYearConstants", entityId: String(year) });
    revalidatePath("/payroll/pressupostos");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível guardar as constantes fiscais." };
  }
}

// Uma tabela de IRS junta os escalões que se aplicam a um período (ano) e
// região fiscal (Continente/Açores/Madeira) — RH cria uma tabela nova
// sempre que a Autoridade Tributária publica valores atualizados ou uma
// tabela específica de uma região.
export type CreateIrsTableState = { error?: string };

export async function createIrsTable(
  _prev: CreateIrsTableState,
  formData: FormData
): Promise<CreateIrsTableState> {
  try {
    const user = await assertCanWrite();
    const year = Number(formData.get("year"));
    const monthFrom = Number(formData.get("monthFrom") ?? 1);
    const monthTo = Number(formData.get("monthTo") ?? 12);
    const region = String(formData.get("region") ?? "CONTINENTE");
    const tableType = String(formData.get("tableType") ?? "I") as IrsTableType;
    const label = String(formData.get("label") ?? "").trim() || null;

    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("Ano inválido.");
    if (!FISCAL_REGIONS.includes(region as (typeof FISCAL_REGIONS)[number])) throw new Error("Região inválida.");
    if (!IRS_TABLE_TYPES.includes(tableType)) throw new Error("Tabela inválida.");
    if (!(monthFrom >= 1 && monthFrom <= 12 && monthTo >= 1 && monthTo <= 12 && monthFrom <= monthTo)) {
      throw new Error("Intervalo de meses inválido.");
    }

    const sameGroup = await prisma.irsTable.findMany({ where: { year, region, tableType } });
    const overlapping = sameGroup.find((t) => monthFrom <= t.monthTo && monthTo >= t.monthFrom);
    if (overlapping) {
      throw new Error(
        `Já existe uma tabela de IRS ${tableType} para ${year} — ${region} a cobrir os meses ${overlapping.monthFrom}-${overlapping.monthTo}.`
      );
    }

    const table = await prisma.irsTable.create({ data: { year, monthFrom, monthTo, region, tableType, label } });
    await logAudit({
      userId: user.id,
      action: "CREATE",
      entity: "IrsTable",
      entityId: table.id,
      details: `${year} — ${region} — Tabela ${tableType}`,
    });
    revalidatePath("/payroll/pressupostos");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar a tabela de IRS." };
  }
}

export async function deleteIrsTable(id: string) {
  const user = await assertCanWrite();
  const table = await prisma.irsTable.findUniqueOrThrow({ where: { id } });
  await prisma.irsTable.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "DELETE", entity: "IrsTable", entityId: id, details: `${table.year} — ${table.region}` });
  revalidatePath("/payroll/pressupostos");
}

export type UpsertIrsBracketState = { error?: string };

export async function upsertIrsBracket(
  _prev: UpsertIrsBracketState,
  formData: FormData
): Promise<UpsertIrsBracketState> {
  try {
    const user = await assertCanWrite();
    const id = String(formData.get("id") ?? "") || null;
    const irsTableId = String(formData.get("irsTableId") ?? "");
    const order = Number(formData.get("order"));
    const upToGrossRaw = String(formData.get("upToGross") ?? "").trim();
    const upToGross = upToGrossRaw ? Number(upToGrossRaw) : null;
    const rate = Number(formData.get("rate"));
    const deductionRaw = String(formData.get("deduction") ?? "").trim();
    const deduction = deductionRaw ? Number(deductionRaw) : null;
    const dependentAddition = Number(formData.get("dependentAddition") ?? 0);

    if (!irsTableId) throw new Error("Tabela de IRS em falta.");
    if (!(rate >= 0 && rate < 1)) throw new Error("Taxa do escalão tem de estar entre 0% e 100%.");
    if (upToGross !== null && upToGross <= 0) throw new Error("Limite do escalão tem de ser positivo.");

    // A edição manual só suporta a parcela a abater fixa — a fórmula
    // dinâmica dos escalões mais baixos só chega por importação Excel das
    // tabelas oficiais (ver importIrsTableAction).
    const data = {
      order,
      upToGross,
      rate,
      deduction,
      deductionCoefficient: null,
      deductionThreshold: null,
      dependentAddition,
    };
    if (id) {
      await prisma.irsBracket.update({ where: { id }, data });
    } else {
      await prisma.irsBracket.create({ data: { irsTableId, ...data } });
    }

    await logAudit({ userId: user.id, action: "UPDATE", entity: "IrsBracket", details: `Escalão ${order}` });
    revalidatePath("/payroll/pressupostos");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível guardar o escalão." };
  }
}

export async function deleteIrsBracket(id: string) {
  const user = await assertCanWrite();
  await prisma.irsBracket.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "DELETE", entity: "IrsBracket", entityId: id });
  revalidatePath("/payroll/pressupostos");
}

export type ImportIrsTableState = {
  error?: string;
  success?: boolean;
  imported?: number;
  // Já existe tabela com escalões para este período — pede confirmação ao
  // utilizador antes de substituir (reenvia o mesmo formulário com
  // replace=1).
  duplicate?: { year: number; region: string; tableType: string; monthFrom: number; monthTo: number };
};

// "Anexar" uma tabela de IRS completa de uma vez — cria a tabela para o
// ano/região/tabela indicados (ou reutiliza uma já existente, sem
// escalões) e importa os escalões de um ficheiro Excel. Colunas: Ordem,
// Até (€), Taxa, Parcela a Abater (€) (opcional), Coeficiente (opcional —
// só nos escalões mais baixos com fórmula dinâmica), Limiar (€) (idem),
// Adicional por Dependente (€) (opcional).
export async function importIrsTableAction(
  _prev: ImportIrsTableState,
  formData: FormData
): Promise<ImportIrsTableState> {
  const user = await assertCanWrite();

  const year = Number(formData.get("year"));
  const monthFrom = Number(formData.get("monthFrom") ?? 1);
  const monthTo = Number(formData.get("monthTo") ?? 12);
  const region = String(formData.get("region") ?? "CONTINENTE");
  const tableType = String(formData.get("tableType") ?? "I") as IrsTableType;
  const label = String(formData.get("label") ?? "").trim() || null;
  const file = formData.get("file") as File | null;
  const replace = formData.get("replace") === "1";

  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: "Ano inválido." };
  if (!FISCAL_REGIONS.includes(region as (typeof FISCAL_REGIONS)[number])) return { error: "Região inválida." };
  if (!IRS_TABLE_TYPES.includes(tableType)) return { error: "Tabela inválida." };
  if (!(monthFrom >= 1 && monthFrom <= 12 && monthTo >= 1 && monthTo <= 12 && monthFrom <= monthTo)) {
    return { error: "Intervalo de meses inválido." };
  }
  if (!file || file.size === 0) return { error: "Selecione um ficheiro Excel." };

  let rows: Record<string, unknown>[];
  try {
    rows = await parseExcelFile(file);
  } catch {
    return { error: "Não foi possível ler o ficheiro. Confirme que é um Excel válido (.xlsx)." };
  }
  if (rows.length === 0) return { error: "O ficheiro não contém linhas de dados." };

  const toNum = (v: unknown): number | null => (v === "" || v == null ? null : Number(v));
  const brackets: {
    order: number;
    upToGross: number | null;
    rate: number;
    deduction: number | null;
    deductionCoefficient: number | null;
    deductionThreshold: number | null;
    dependentAddition: number;
  }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const order = Number(row["Ordem"] ?? i + 1);
    const upToGross = toNum(row["Até (€)"]);
    const rate = Number(row["Taxa"]);
    const deduction = toNum(row["Parcela a Abater (€)"]);
    const deductionCoefficient = toNum(row["Coeficiente"]);
    const deductionThreshold = toNum(row["Limiar (€)"]);
    const dependentAddition = toNum(row["Adicional por Dependente (€)"]) ?? 0;
    if (!Number.isFinite(order) || !Number.isFinite(rate) || rate < 0 || rate >= 1) {
      return { error: `Linha ${i + 2}: dados inválidos (confirme Ordem, Até (€) e Taxa entre 0 e 1).` };
    }
    brackets.push({
      order,
      upToGross: upToGross !== null && Number.isFinite(upToGross) ? upToGross : null,
      rate,
      deduction,
      deductionCoefficient,
      deductionThreshold,
      dependentAddition,
    });
  }

  const sameGroup = await prisma.irsTable.findMany({ where: { year, region, tableType } });
  let table = sameGroup.find((t) => t.monthFrom === monthFrom && t.monthTo === monthTo);
  const overlapping = !table && sameGroup.find((t) => monthFrom <= t.monthTo && monthTo >= t.monthFrom);

  if (overlapping && !replace) {
    return {
      duplicate: { year, region, tableType, monthFrom: overlapping.monthFrom, monthTo: overlapping.monthTo },
    };
  }
  if (overlapping) table = overlapping;

  if (table) {
    const existingBrackets = await prisma.irsBracket.count({ where: { irsTableId: table.id } });
    if (existingBrackets > 0 && !replace) {
      return { duplicate: { year, region, tableType, monthFrom: table.monthFrom, monthTo: table.monthTo } };
    }
    if (existingBrackets > 0) {
      await prisma.irsBracket.deleteMany({ where: { irsTableId: table.id } });
    }
    await prisma.irsTable.update({ where: { id: table.id }, data: { monthFrom, monthTo, label: label ?? table.label } });
  } else {
    table = await prisma.irsTable.create({ data: { year, monthFrom, monthTo, region, tableType, label } });
  }

  await prisma.irsBracket.createMany({ data: brackets.map((b) => ({ ...b, irsTableId: table!.id })) });

  await logAudit({
    userId: user.id,
    action: replace ? "UPDATE" : "CREATE",
    entity: "IrsTable",
    entityId: table.id,
    details: `${year} — ${region} — Tabela ${tableType}: ${brackets.length} escalão(ões) ${replace ? "substituído(s)" : "importado(s)"}`,
  });

  revalidatePath("/payroll/pressupostos");
  return { success: true, imported: brackets.length };
}

export type UpdateBaseSalaryState = { error?: string; success?: boolean };

// Vencimento base — pertence ao colaborador, não ao contrato: um aumento
// salarial altera só este valor, sem criar/alterar nenhum EmployeeContract.
export async function updateEmployeeBaseSalary(
  employeeId: string,
  _prev: UpdateBaseSalaryState,
  formData: FormData
): Promise<UpdateBaseSalaryState> {
  try {
    const user = await assertCanWrite();
    const baseSalaryRaw = String(formData.get("baseSalary") ?? "").trim();
    const baseSalary = baseSalaryRaw ? Number(baseSalaryRaw) : null;
    if (baseSalary !== null && !(baseSalary >= 0)) {
      throw new Error("Vencimento base inválido.");
    }

    await prisma.employee.update({ where: { id: employeeId }, data: { baseSalary } });

    await logAudit({ userId: user.id, action: "UPDATE", entity: "EmployeeBaseSalary", entityId: employeeId });
    revalidatePath(`/payroll/${employeeId}`);
    revalidatePath(`/colaboradores/${employeeId}`);
    revalidatePath(`/colaboradores/${employeeId}/payroll`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível guardar o vencimento base." };
  }
}

export async function updateEmployeePayrollProfile(employeeId: string, formData: FormData) {
  const user = await assertCanWrite();

  const youngTaxRegime = formData.get("youngTaxRegime") === "on";
  const youngTaxRegimeStartYearRaw = String(formData.get("youngTaxRegimeStartYear") ?? "").trim();
  const youngTaxRegimeStartYear = youngTaxRegimeStartYearRaw ? Number(youngTaxRegimeStartYearRaw) : null;
  const adseBeneficiary = formData.get("adseBeneficiary") === "on";
  const judicialDeductionPercentRaw = String(formData.get("judicialDeductionPercent") ?? "").trim();
  const judicialDeductionPercent = judicialDeductionPercentRaw ? Number(judicialDeductionPercentRaw) : null;
  const vacationSubsidyMode = String(formData.get("vacationSubsidyMode") ?? "") || null;
  const vacationSubsidyMonths = String(formData.get("vacationSubsidyMonths") ?? "").trim() || null;
  const christmasSubsidyMode = String(formData.get("christmasSubsidyMode") ?? "") || null;
  const christmasSubsidyMonths = String(formData.get("christmasSubsidyMonths") ?? "").trim() || null;

  if (youngTaxRegime && !youngTaxRegimeStartYear) {
    throw new Error("Indique o ano de início do regime do IRS Jovem.");
  }
  if (judicialDeductionPercent !== null && !(judicialDeductionPercent >= 0 && judicialDeductionPercent <= 100)) {
    throw new Error("Percentagem de desconto judicial tem de estar entre 0% e 100%.");
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      youngTaxRegime,
      youngTaxRegimeStartYear: youngTaxRegime ? youngTaxRegimeStartYear : null,
      adseBeneficiary,
      judicialDeductionPercent,
      vacationSubsidyMode,
      vacationSubsidyMonths,
      christmasSubsidyMode,
      christmasSubsidyMonths,
    },
  });

  await logAudit({ userId: user.id, action: "UPDATE", entity: "EmployeePayrollProfile", entityId: employeeId });
  revalidatePath(`/payroll/${employeeId}`);
  revalidatePath(`/colaboradores/${employeeId}`);
}

export type AddPayrollComponentState = { error?: string };

export async function addPayrollComponent(
  employeeId: string,
  _prev: AddPayrollComponentState,
  formData: FormData
): Promise<AddPayrollComponentState> {
  try {
    const user = await assertCanWrite();

    const name = String(formData.get("name") ?? "").trim();
    const type = String(formData.get("type") ?? "EARNING");
    const amount = Number(formData.get("amount"));
    const recurring = formData.get("recurring") === "on";
    const category = String(formData.get("category") ?? "TAXABLE_SS") as PayrollComponentCategory;
    const { taxable, ssApplicable } = categoryToTaxFlags(category);
    const applyYear = recurring ? null : Number(formData.get("applyYear"));
    const applyMonth = recurring ? null : Number(formData.get("applyMonth"));

    if (!name) throw new Error("Indique um nome para a componente.");
    if (!(amount > 0)) throw new Error("O valor tem de ser superior a 0.");
    if (!recurring && (!applyYear || !applyMonth)) {
      throw new Error("Indique o mês/ano para uma componente pontual.");
    }

    await prisma.payrollComponent.create({
      data: { employeeId, name, type, amount, recurring, taxable, ssApplicable, applyYear, applyMonth },
    });

    await logAudit({ userId: user.id, action: "CREATE", entity: "PayrollComponent", details: `${name} (${employeeId})` });
    revalidatePath(`/payroll/${employeeId}`);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível adicionar a componente." };
  }
}

export type AddPayrollComponentDirectState = { error?: string; success?: boolean };

export async function addPayrollComponentDirect(
  _prev: AddPayrollComponentDirectState,
  formData: FormData
): Promise<AddPayrollComponentDirectState> {
  try {
    const user = await assertCanWrite();

    const employeeId = String(formData.get("employeeId") ?? "").trim();
    if (!employeeId) throw new Error("Selecione um colaborador.");
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!employee) throw new Error("Colaborador não encontrado.");

    const name = String(formData.get("name") ?? "").trim();
    const type = String(formData.get("type") ?? "EARNING");
    const amount = Number(formData.get("amount"));
    const recurring = formData.get("recurring") === "on";
    const category = String(formData.get("category") ?? "TAXABLE_SS") as PayrollComponentCategory;
    const { taxable, ssApplicable } = categoryToTaxFlags(category);
    const applyYear = recurring ? null : Number(formData.get("applyYear"));
    const applyMonth = recurring ? null : Number(formData.get("applyMonth"));

    if (!name) throw new Error("Indique um nome para a componente.");
    if (!(amount > 0)) throw new Error("O valor tem de ser superior a 0.");
    if (!recurring && (!applyYear || !applyMonth)) {
      throw new Error("Indique o mês/ano para uma componente pontual.");
    }

    await prisma.payrollComponent.create({
      data: { employeeId, name, type, amount, recurring, taxable, ssApplicable, applyYear, applyMonth },
    });

    await logAudit({ userId: user.id, action: "CREATE", entity: "PayrollComponent", details: `${name} (${employeeId})` });
    revalidatePath(`/payroll/${employeeId}`);
    revalidatePath("/payroll/rubricas");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível adicionar a componente." };
  }
}

export async function removePayrollComponent(id: string, employeeId: string) {
  const user = await assertCanWrite();
  await prisma.payrollComponent.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "DELETE", entity: "PayrollComponent", entityId: id });
  revalidatePath(`/payroll/${employeeId}`);
}

export type GeneratePayslipState = {
  error?: string;
  success?: boolean;
};

export async function generatePayslipAction(
  _prev: GeneratePayslipState,
  formData: FormData
): Promise<GeneratePayslipState> {
  const user = await assertCanWrite();
  const employeeId = String(formData.get("employeeId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));

  try {
    const breakdown = await computePayslipBreakdown(employeeId, year, month);
    const record = toPayslipRecord(breakdown);

    const existing = await prisma.payslip.findUnique({
      where: { employeeId_year_month: { employeeId, year, month } },
      select: { regenerationCount: true },
    });

    await prisma.payslip.upsert({
      where: { employeeId_year_month: { employeeId, year, month } },
      create: { ...record, generatedById: user.id },
      update: {
        ...record,
        regeneratedAt: new Date(),
        regeneratedById: user.id,
        regenerationCount: (existing?.regenerationCount ?? 0) + 1,
      },
    });

    await logAudit({
      userId: user.id,
      action: "GENERATE",
      entity: "Payslip",
      entityId: employeeId,
      details: existing ? `${month}/${year} (regerado)` : `${month}/${year}`,
    });

    revalidatePath(`/payroll/${employeeId}`);
    revalidatePath("/payroll");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao gerar recibo." };
  }
}

// Gera (ou regenera) o recibo para vários colaboradores de uma vez, no
// mesmo período — "gerar só para alguns colaboradores selecionados".
export type GeneratePayslipsBulkState = { error?: string; created?: number; failed?: string[] };

export async function generatePayslipsBulkAction(
  employeeIds: string[],
  year: number,
  month: number
): Promise<GeneratePayslipsBulkState> {
  const user = await assertCanWrite();
  if (employeeIds.length === 0) return { error: "Selecione pelo menos um colaborador." };

  let created = 0;
  const failed: string[] = [];

  for (const employeeId of employeeIds) {
    try {
      const breakdown = await computePayslipBreakdown(employeeId, year, month);
      const record = toPayslipRecord(breakdown);
      const existing = await prisma.payslip.findUnique({
        where: { employeeId_year_month: { employeeId, year, month } },
        select: { regenerationCount: true },
      });
      await prisma.payslip.upsert({
        where: { employeeId_year_month: { employeeId, year, month } },
        create: { ...record, generatedById: user.id },
        update: {
          ...record,
          regeneratedAt: new Date(),
          regeneratedById: user.id,
          regenerationCount: (existing?.regenerationCount ?? 0) + 1,
        },
      });
      created++;
    } catch {
      failed.push(employeeId);
    }
  }

  await logAudit({
    userId: user.id,
    action: "GENERATE",
    entity: "Payslip",
    details: `${created}/${employeeIds.length} recibo(s) gerado(s) para ${month}/${year}`,
  });

  revalidatePath("/payroll");
  return { created, failed: failed.length > 0 ? failed : undefined };
}

export type SendPayslipEmailState = { error?: string; success?: boolean };

// Envia o PDF do recibo já gerado por email ao colaborador (Resend — ver
// src/lib/email.ts). Requer RESEND_API_KEY/PAYROLL_EMAIL_FROM configurados.
export async function sendPayslipEmailAction(
  employeeId: string,
  year: number,
  month: number
): Promise<SendPayslipEmailState> {
  const user = await assertCanWrite();

  const [employee, payslip, branding, layout] = await Promise.all([
    prisma.employee.findUniqueOrThrow({ where: { id: employeeId } }),
    prisma.payslip.findUnique({ where: { employeeId_year_month: { employeeId, year, month } } }),
    getDocumentBranding(),
    getPayslipLayoutSettings(),
  ]);
  if (!payslip) return { error: "O recibo deste período ainda não foi gerado." };
  if (!employee.email) return { error: "O colaborador não tem email na ficha." };

  const ytdPayslips = await prisma.payslip.findMany({ where: { employeeId, year, month: { lte: month } } });
  const ytdGross = ytdPayslips.reduce((sum, p) => sum + p.grossTotal, 0);
  const ytdIrs = ytdPayslips.reduce((sum, p) => sum + p.irsWithholding, 0);
  const ytdSocialSecurity = ytdPayslips.reduce((sum, p) => sum + p.socialSecurityEmployee, 0);

  const lines = buildPayslipLines(payslip, layout.lineItems, false, true);

  const { buildPayslipPdfDoc, payslipPdfFileName } = await import("@/lib/payslip-pdf");
  const pdfData = {
    companyName: branding.clientCompanyName,
    companyLogo: branding.clientCompanyLogo,
    companyNif: branding.companyNif,
    companyAddress: branding.companyAddress,
    companySocialSecurityNo: branding.companySocialSecurityNo,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    employeeNumber: employee.employeeNumber,
    nif: employee.nif,
    socialSecurityNo: employee.socialSecurityNo,
    address: employee.address,
    iban: employee.iban,
    jobTitle: employee.jobTitle,
    year,
    month,
    documentTitle: layout.documentTitle,
    footerNote: layout.footerNote,
    earnings: lines.filter((l) => l.section === "EARNINGS").map((l) => ({ label: l.label, value: l.value })),
    deductions: lines.filter((l) => l.section === "DEDUCTIONS").map((l) => ({ label: l.label, value: l.value })),
    grossTotal: payslip.grossTotal,
    netTotal: payslip.netTotal,
    employerCost: payslip.employerCost,
    ytdGross,
    ytdIrs,
    ytdSocialSecurity,
  };

  const doc = await buildPayslipPdfDoc(pdfData);
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  const { sendEmailWithAttachment } = await import("@/lib/email");
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("pt-PT", { month: "long" });
  const result = await sendEmailWithAttachment({
    to: employee.email,
    subject: `Recibo de vencimento — ${monthName} de ${year}`,
    html: `<p>Olá ${employee.firstName},</p><p>Segue em anexo o recibo de vencimento de ${monthName} de ${year}.</p>`,
    attachment: { filename: payslipPdfFileName(pdfData), content: pdfBuffer },
  });

  if (!result.ok) return { error: result.error };

  await prisma.payslip.update({
    where: { employeeId_year_month: { employeeId, year, month } },
    data: { emailSentAt: new Date() },
  });
  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "Payslip",
    entityId: employeeId,
    details: `Recibo de ${month}/${year} enviado por email para ${employee.email}`,
  });
  revalidatePath(`/payroll/${employeeId}/${year}/${month}`);
  return { success: true };
}

export async function ensureSettingsSeeded() {
  await getPayrollSettings();
}

// Layout do recibo de vencimento — que linhas aparecem, com que texto e por
// que ordem (ver /payroll/layout). O formulário envia um campo por linha
// (label_<key>, visible_<key>, order_<key>); a secção de cada chave nunca
// vem do formulário, vem sempre da lista fixa de chaves suportadas.
export async function updatePayslipLayoutSettings(formData: FormData) {
  const user = await assertCanWrite();

  const documentTitle = String(formData.get("documentTitle") ?? "").trim() || "Recibo de Vencimento";
  const footerNoteRaw = String(formData.get("footerNote") ?? "").trim();

  const items = DEFAULT_PAYSLIP_LINE_ITEMS.map((def) => {
    const key = def.key as PayslipLineItemKey;
    const label = String(formData.get(`label_${key}`) ?? "").trim() || def.label;
    const visible = formData.get(`visible_${key}`) === "on";
    const order = Number(formData.get(`order_${key}`) ?? 0);
    return { key, label, section: def.section, visible, order };
  });
  items.sort((a, b) => a.order - b.order);
  const lineItems = items.map(({ key, label, section, visible }) => ({ key, label, section, visible }));

  const existing = await prisma.payslipLayoutSettings.findFirst();
  const data = {
    documentTitle,
    footerNote: footerNoteRaw || null,
    lineItemsJson: JSON.stringify(lineItems),
    updatedById: user.id,
  };

  if (existing) {
    await prisma.payslipLayoutSettings.update({ where: { id: existing.id }, data });
  } else {
    await prisma.payslipLayoutSettings.create({ data });
  }

  await logAudit({ userId: user.id, action: "UPDATE", entity: "PayslipLayoutSettings" });
  revalidatePath("/payroll/layout");
  revalidatePath("/payroll");
}

// ---------------------------------------------------------------------------
// Rubricas mensais (PayrollComponent) em massa — carregamento por Excel para
// todos os colaboradores de uma vez, com deteção de duplicados (mesmo
// colaborador + rubrica + período) a confirmar antes de substituir.
// ---------------------------------------------------------------------------

export type PayrollComponentDuplicate = {
  key: string;
  employeeId: string;
  employeeName: string;
  existingComponentId: string;
  name: string;
  type: "EARNING" | "DEDUCTION";
  category: PayrollComponentCategory;
  newAmount: number;
  existingAmount: number;
  recurring: boolean;
  applyYear: number | null;
  applyMonth: number | null;
};

export type ImportPayrollComponentsState = {
  error?: string;
  created?: number;
  duplicates?: PayrollComponentDuplicate[];
};

function parseComponentCategory(raw: unknown): PayrollComponentCategory {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s.includes("isent")) return "EXEMPT";
  if (s.includes("só") || s.includes("so ") || s.includes("apenas")) return "TAXABLE_ONLY";
  return "TAXABLE_SS";
}

// Carrega rubricas (prémios, subsídios específicos, benefícios, descontos)
// para vários colaboradores de uma vez a partir de um Excel. Colunas: Nº
// Colaborador (ou Email), Rubrica, Tipo (Vencimento/Desconto), Categoria
// (Sujeito a IRS e SS / Sujeito só a IRS / Isento), Valor, Recorrente
// (Sim/Não), Ano e Mês (só quando não recorrente). Linhas sem conflito são
// criadas de imediato; linhas que colidem com uma rubrica já existente
// (mesmo colaborador+nome+período) ficam pendentes de confirmação — ver
// resolvePayrollComponentDuplicatesAction.
export async function importPayrollComponentsAction(
  _prev: ImportPayrollComponentsState,
  formData: FormData
): Promise<ImportPayrollComponentsState> {
  const user = await assertCanWrite();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Selecione um ficheiro Excel." };

  let rows: Record<string, unknown>[];
  try {
    rows = await parseExcelFile(file);
  } catch {
    return { error: "Não foi possível ler o ficheiro. Confirme que é um Excel válido (.xlsx)." };
  }
  if (rows.length === 0) return { error: "O ficheiro não contém linhas de dados." };

  const employees = await prisma.employee.findMany({
    select: { id: true, employeeNumber: true, email: true, firstName: true, lastName: true },
  });
  const byNumber = new Map(employees.filter((e) => e.employeeNumber).map((e) => [e.employeeNumber as string, e]));
  const byEmail = new Map(employees.map((e) => [e.email.toLowerCase(), e]));

  type ParsedRow = {
    employeeId: string;
    employeeName: string;
    name: string;
    type: "EARNING" | "DEDUCTION";
    category: PayrollComponentCategory;
    amount: number;
    recurring: boolean;
    applyYear: number | null;
    applyMonth: number | null;
  };
  const parsed: ParsedRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const identifier = String(row["Nº Colaborador"] ?? row["Email"] ?? "").trim();
    if (!identifier) return { error: `Linha ${rowNum}: indique o Nº de Colaborador ou o Email.` };
    const employee = byNumber.get(identifier) ?? byEmail.get(identifier.toLowerCase());
    if (!employee) return { error: `Linha ${rowNum}: colaborador "${identifier}" não encontrado.` };

    const name = String(row["Rubrica"] ?? "").trim();
    if (!name) return { error: `Linha ${rowNum}: indique o nome da rubrica.` };

    const typeRaw = String(row["Tipo"] ?? "").trim().toLowerCase();
    const type: "EARNING" | "DEDUCTION" = typeRaw.startsWith("desc") ? "DEDUCTION" : "EARNING";
    const category = parseComponentCategory(row["Categoria"]);

    const amount = Number(row["Valor"]);
    if (!Number.isFinite(amount) || amount <= 0) return { error: `Linha ${rowNum}: valor inválido.` };

    const recurringRaw = String(row["Recorrente"] ?? "sim").trim().toLowerCase();
    const recurring = !(recurringRaw.startsWith("n") || recurringRaw === "false" || recurringRaw === "0");

    let applyYear: number | null = null;
    let applyMonth: number | null = null;
    if (!recurring) {
      applyYear = Number(row["Ano"]);
      applyMonth = Number(row["Mês"] ?? row["Mes"]);
      if (!applyYear || !applyMonth) return { error: `Linha ${rowNum}: indique Ano e Mês para uma rubrica pontual.` };
    }

    parsed.push({
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      name,
      type,
      category,
      amount,
      recurring,
      applyYear,
      applyMonth,
    });
  }

  const existingComponents = await prisma.payrollComponent.findMany({
    where: { employeeId: { in: [...new Set(parsed.map((p) => p.employeeId))] } },
  });

  const toCreate: ParsedRow[] = [];
  const duplicates: PayrollComponentDuplicate[] = [];

  for (const row of parsed) {
    const match = existingComponents.find(
      (c) =>
        c.employeeId === row.employeeId &&
        c.name.toLowerCase() === row.name.toLowerCase() &&
        c.recurring === row.recurring &&
        (row.recurring || (c.applyYear === row.applyYear && c.applyMonth === row.applyMonth))
    );
    if (match) {
      duplicates.push({
        key: `${row.employeeId}:${row.name}:${row.applyYear ?? ""}:${row.applyMonth ?? ""}`,
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        existingComponentId: match.id,
        name: row.name,
        type: row.type,
        category: row.category,
        newAmount: row.amount,
        existingAmount: match.amount,
        recurring: row.recurring,
        applyYear: row.applyYear,
        applyMonth: row.applyMonth,
      });
    } else {
      toCreate.push(row);
    }
  }

  if (toCreate.length > 0) {
    await prisma.payrollComponent.createMany({
      data: toCreate.map((r) => {
        const { taxable, ssApplicable } = categoryToTaxFlags(r.category);
        return {
          employeeId: r.employeeId,
          name: r.name,
          type: r.type,
          amount: r.amount,
          recurring: r.recurring,
          taxable,
          ssApplicable,
          applyYear: r.applyYear,
          applyMonth: r.applyMonth,
        };
      }),
    });
    await logAudit({
      userId: user.id,
      action: "IMPORT",
      entity: "PayrollComponent",
      details: `${toCreate.length} rubrica(s) importada(s) de ${file.name}`,
    });
    revalidatePath("/payroll");
  }

  return { created: toCreate.length, duplicates: duplicates.length > 0 ? duplicates : undefined };
}

// Aplica as decisões tomadas na modal de duplicados (ver
// importPayrollComponentsAction) — substitui só as rubricas que o
// utilizador confirmou (linha a linha, ou todas de uma vez via "aplicar a
// todos" no cliente).
export async function resolvePayrollComponentDuplicatesAction(
  resolutions: {
    existingComponentId: string;
    replace: boolean;
    newAmount: number;
    type: "EARNING" | "DEDUCTION";
    category: PayrollComponentCategory;
  }[]
): Promise<{ replaced: number }> {
  const user = await assertCanWrite();
  let replaced = 0;
  for (const r of resolutions) {
    if (!r.replace) continue;
    const { taxable, ssApplicable } = categoryToTaxFlags(r.category);
    await prisma.payrollComponent.update({
      where: { id: r.existingComponentId },
      data: { amount: r.newAmount, type: r.type, taxable, ssApplicable },
    });
    replaced++;
  }
  if (replaced > 0) {
    await logAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "PayrollComponent",
      details: `${replaced} rubrica(s) substituída(s) por importação`,
    });
    revalidatePath("/payroll");
  }
  return { replaced };
}
