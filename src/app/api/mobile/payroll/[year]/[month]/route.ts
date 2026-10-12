import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { getPayslipLayoutSettings, buildPayslipLines } from "@/lib/payroll";

export async function GET(req: Request, { params }: { params: Promise<{ year: string; month: string }> }) {
  try {
    const user = await requireMobileUser(req);
    if (!user.employeeId) {
      return NextResponse.json({ error: "Conta sem ficha de colaborador associada." }, { status: 404 });
    }

    const { year: yearStr, month: monthStr } = await params;
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!Number.isInteger(year) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Período inválido." }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      select: { firstName: true, lastName: true, jobTitle: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Colaborador não encontrado." }, { status: 404 });
    }

    // A app mobile trata sempre o utilizador como Colaborador — só pode ver
    // um recibo já gerado, nunca a pré-visualização calculada na hora que a
    // gestão vê para meses ainda por processar.
    const savedPayslip = await prisma.payslip.findUnique({
      where: { employeeId_year_month: { employeeId: user.employeeId, year, month } },
    });
    if (!savedPayslip) {
      return NextResponse.json({ error: "Recibo ainda não gerado para este período." }, { status: 404 });
    }

    const [layout, ytdPayslips] = await Promise.all([
      getPayslipLayoutSettings(),
      prisma.payslip.findMany({ where: { employeeId: user.employeeId, year, month: { lte: month } } }),
    ]);
    const breakdown = savedPayslip;
    const lines = buildPayslipLines(breakdown, layout.lineItems, false, true);
    const earnings = lines.filter((l) => l.section === "EARNINGS").map((l) => ({ label: l.label, value: l.value }));
    const deductions = lines.filter((l) => l.section === "DEDUCTIONS").map((l) => ({ label: l.label, value: l.value }));

    const ytdGross = ytdPayslips.reduce((sum, p) => sum + p.grossTotal, 0);
    const ytdIrs = ytdPayslips.reduce((sum, p) => sum + p.irsWithholding, 0);
    const ytdSocialSecurity = ytdPayslips.reduce((sum, p) => sum + p.socialSecurityEmployee, 0);

    return NextResponse.json({
      employeeName: `${employee.firstName} ${employee.lastName}`,
      jobTitle: employee.jobTitle,
      year,
      month,
      generatedAt: savedPayslip.generatedAt,
      earnings,
      deductions,
      grossTotal: breakdown.grossTotal,
      netTotal: breakdown.netTotal,
      employerCost: breakdown.employerCost,
      workedHours: breakdown.workedHours,
      workedDays: breakdown.workedDays,
      ytdGross,
      ytdIrs,
      ytdSocialSecurity,
    });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
