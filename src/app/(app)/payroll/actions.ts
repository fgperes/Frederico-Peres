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
  type PayslipLineItemKey,
} from "@/lib/payroll";
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
  const mealAllowanceExemptCap = Number(formData.get("mealAllowanceExemptCap"));
  const overtimeRateFirstHour = Number(formData.get("overtimeRateFirstHour"));
  const overtimeRateAdditional = Number(formData.get("overtimeRateAdditional"));
  const overtimeRateWeekendHoliday = Number(formData.get("overtimeRateWeekendHoliday"));
  const workingDaysPerMonth = Number(formData.get("workingDaysPerMonth"));
  const vacationSubsidyMode = String(formData.get("vacationSubsidyMode"));
  const christmasSubsidyMode = String(formData.get("christmasSubsidyMode"));

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

  if (errors.length > 0) throw new Error(errors.join(" "));

  const existing = await prisma.payrollSettings.findFirst();
  const data = {
    minimumWage,
    socialSecurityEmployeeRate,
    socialSecurityEmployerRate,
    workAccidentInsuranceRate,
    mealAllowanceDaily,
    mealAllowanceExemptCap,
    overtimeRateFirstHour,
    overtimeRateAdditional,
    overtimeRateWeekendHoliday,
    workingDaysPerMonth,
    vacationSubsidyMode,
    christmasSubsidyMode,
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
    const region = String(formData.get("region") ?? "CONTINENTE");
    const label = String(formData.get("label") ?? "").trim() || null;

    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("Ano inválido.");
    if (!FISCAL_REGIONS.includes(region as (typeof FISCAL_REGIONS)[number])) throw new Error("Região inválida.");

    const existing = await prisma.irsTable.findUnique({ where: { year_region: { year, region } } });
    if (existing) throw new Error(`Já existe uma tabela de IRS para ${year} — ${region}.`);

    const table = await prisma.irsTable.create({ data: { year, region, label } });
    await logAudit({ userId: user.id, action: "CREATE", entity: "IrsTable", entityId: table.id, details: `${year} — ${region}` });
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

    if (!irsTableId) throw new Error("Tabela de IRS em falta.");
    if (!(rate >= 0 && rate < 1)) throw new Error("Taxa do escalão tem de estar entre 0% e 100%.");
    if (upToGross !== null && upToGross <= 0) throw new Error("Limite do escalão tem de ser positivo.");

    if (id) {
      await prisma.irsBracket.update({ where: { id }, data: { order, upToGross, rate } });
    } else {
      await prisma.irsBracket.create({ data: { irsTableId, order, upToGross, rate } });
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

export type ImportIrsTableState = { error?: string; success?: boolean; imported?: number };

// "Anexar" uma tabela de IRS completa de uma vez — cria a tabela para o
// ano/região indicados (ou reutiliza uma já existente, sem escalões) e
// importa os escalões de um ficheiro Excel (colunas: Ordem, Até (€), Taxa).
export async function importIrsTableAction(
  _prev: ImportIrsTableState,
  formData: FormData
): Promise<ImportIrsTableState> {
  const user = await assertCanWrite();

  const year = Number(formData.get("year"));
  const region = String(formData.get("region") ?? "CONTINENTE");
  const label = String(formData.get("label") ?? "").trim() || null;
  const file = formData.get("file") as File | null;

  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: "Ano inválido." };
  if (!FISCAL_REGIONS.includes(region as (typeof FISCAL_REGIONS)[number])) return { error: "Região inválida." };
  if (!file || file.size === 0) return { error: "Selecione um ficheiro Excel." };

  let rows: Record<string, unknown>[];
  try {
    rows = await parseExcelFile(file);
  } catch {
    return { error: "Não foi possível ler o ficheiro. Confirme que é um Excel válido (.xlsx)." };
  }
  if (rows.length === 0) return { error: "O ficheiro não contém linhas de dados." };

  const brackets: { order: number; upToGross: number | null; rate: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const order = Number(row["Ordem"] ?? i + 1);
    const upToGrossRaw = row["Até (€)"];
    const upToGross = upToGrossRaw === "" || upToGrossRaw == null ? null : Number(upToGrossRaw);
    const rate = Number(row["Taxa"]);
    if (!Number.isFinite(order) || !Number.isFinite(rate) || rate < 0 || rate >= 1) {
      return { error: `Linha ${i + 2}: dados inválidos (confirme Ordem, Até (€) e Taxa entre 0 e 1).` };
    }
    brackets.push({ order, upToGross: upToGross === null || Number.isFinite(upToGross) ? upToGross : null, rate });
  }

  let table = await prisma.irsTable.findUnique({ where: { year_region: { year, region } } });
  if (table) {
    const existingBrackets = await prisma.irsBracket.count({ where: { irsTableId: table.id } });
    if (existingBrackets > 0) {
      return { error: `Já existe uma tabela de IRS com escalões para ${year} — ${region}. Elimine-a primeiro se quiser substituir.` };
    }
  } else {
    table = await prisma.irsTable.create({ data: { year, region, label } });
  }

  await prisma.irsBracket.createMany({ data: brackets.map((b) => ({ ...b, irsTableId: table!.id })) });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "IrsTable",
    entityId: table.id,
    details: `${year} — ${region}: ${brackets.length} escalão(ões) importado(s)`,
  });

  revalidatePath("/payroll/pressupostos");
  return { success: true, imported: brackets.length };
}

export async function updateEmployeePayrollProfile(employeeId: string, formData: FormData) {
  const user = await assertCanWrite();

  const maritalStatus = String(formData.get("maritalStatus") ?? "") || null;
  const dependents = Number(formData.get("dependents") ?? 0);
  const fiscalRegion = String(formData.get("fiscalRegion") ?? "CONTINENTE");
  const mealAllowanceOverrideRaw = String(formData.get("mealAllowanceOverride") ?? "").trim();
  const mealAllowanceOverride = mealAllowanceOverrideRaw ? Number(mealAllowanceOverrideRaw) : null;

  if (dependents < 0) throw new Error("Número de dependentes inválido.");

  await prisma.employee.update({
    where: { id: employeeId },
    data: { maritalStatus, dependents, fiscalRegion, mealAllowanceOverride },
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
    const taxable = formData.get("taxable") === "on";
    const ssApplicable = formData.get("ssApplicable") === "on";
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

    await prisma.payslip.upsert({
      where: { employeeId_year_month: { employeeId, year, month } },
      create: { ...record, generatedById: user.id },
      update: { ...record, generatedById: user.id, generatedAt: new Date() },
    });

    await logAudit({
      userId: user.id,
      action: "GENERATE",
      entity: "Payslip",
      entityId: employeeId,
      details: `${month}/${year}`,
    });

    revalidatePath(`/payroll/${employeeId}`);
    revalidatePath("/payroll");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao gerar recibo." };
  }
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
