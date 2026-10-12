import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { getPayslipLayoutSettings, buildPayslipLines } from "@/lib/payroll";
import { getDocumentBranding } from "@/lib/document-branding";
import { buildPayslipPdfDoc, payslipPdfFileName } from "@/lib/payslip-pdf";

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
      select: {
        firstName: true,
        lastName: true,
        employeeNumber: true,
        nif: true,
        socialSecurityNo: true,
        address: true,
        iban: true,
        jobTitle: true,
      },
    });
    if (!employee) {
      return NextResponse.json({ error: "Colaborador não encontrado." }, { status: 404 });
    }

    const savedPayslip = await prisma.payslip.findUnique({
      where: { employeeId_year_month: { employeeId: user.employeeId, year, month } },
    });
    if (!savedPayslip) {
      return NextResponse.json({ error: "Recibo ainda não gerado para este período." }, { status: 404 });
    }

    const [layout, branding, ytdPayslips] = await Promise.all([
      getPayslipLayoutSettings(),
      getDocumentBranding(),
      prisma.payslip.findMany({ where: { employeeId: user.employeeId, year, month: { lte: month } } }),
    ]);

    const lines = buildPayslipLines(savedPayslip, layout.lineItems, false, true);
    const earnings = lines.filter((l) => l.section === "EARNINGS").map((l) => ({ label: l.label, value: l.value }));
    const deductions = lines.filter((l) => l.section === "DEDUCTIONS").map((l) => ({ label: l.label, value: l.value }));

    const ytdGross = ytdPayslips.reduce((sum, p) => sum + p.grossTotal, 0);
    const ytdIrs = ytdPayslips.reduce((sum, p) => sum + p.irsWithholding, 0);
    const ytdSocialSecurity = ytdPayslips.reduce((sum, p) => sum + p.socialSecurityEmployee, 0);

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
      earnings,
      deductions,
      grossTotal: savedPayslip.grossTotal,
      netTotal: savedPayslip.netTotal,
      employerCost: savedPayslip.employerCost,
      ytdGross,
      ytdIrs,
      ytdSocialSecurity,
    };

    const doc = await buildPayslipPdfDoc(pdfData);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${payslipPdfFileName(pdfData)}"`,
      },
    });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
