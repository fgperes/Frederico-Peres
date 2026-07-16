"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { computePayslipBreakdown, getPayrollSettings, toPayslipRecord } from "@/lib/payroll";
import { revalidatePath } from "next/cache";

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "payroll")) {
    throw new Error("Sem permissão para editar dados de payroll.");
  }
  return user;
}

// Pressupostos (taxas, salário mínimo, valores de subsídios) — só Admin/RH.
export async function updatePayrollSettings(formData: FormData) {
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
}

export async function upsertIrsBracket(formData: FormData) {
  const user = await assertCanWrite();
  const id = String(formData.get("id") ?? "") || null;
  const order = Number(formData.get("order"));
  const upToGrossRaw = String(formData.get("upToGross") ?? "").trim();
  const upToGross = upToGrossRaw ? Number(upToGrossRaw) : null;
  const rate = Number(formData.get("rate"));

  if (!(rate >= 0 && rate < 1)) throw new Error("Taxa do escalão tem de estar entre 0% e 100%.");
  if (upToGross !== null && upToGross <= 0) throw new Error("Limite do escalão tem de ser positivo.");

  if (id) {
    await prisma.irsBracket.update({ where: { id }, data: { order, upToGross, rate } });
  } else {
    await prisma.irsBracket.create({ data: { order, upToGross, rate } });
  }

  await logAudit({ userId: user.id, action: "UPDATE", entity: "IrsBracket", details: `Escalão ${order}` });
  revalidatePath("/payroll/pressupostos");
}

export async function deleteIrsBracket(id: string) {
  const user = await assertCanWrite();
  await prisma.irsBracket.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "DELETE", entity: "IrsBracket", entityId: id });
  revalidatePath("/payroll/pressupostos");
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

export async function addPayrollComponent(employeeId: string, formData: FormData) {
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
