import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { computePayslipBreakdown, toPayslipRecord, getPayslipLayoutSettings, buildPayslipLines } from "@/lib/payroll";
import { getDocumentBranding } from "@/lib/document-branding";
import { PageHeader, Card, Badge } from "@/components/ui";
import { ReceiptText } from "lucide-react";
import { notFound } from "next/navigation";
import { GeneratePayslipButton } from "@/components/payroll/generate-payslip-button";
import { PayslipPdfButton } from "@/components/payroll/payslip-pdf-button";
import { SendPayslipEmailButton } from "@/components/payroll/send-payslip-email-button";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function PayslipDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string; year: string; month: string }>;
}) {
  const { employeeId, year: yearStr, month: monthStr } = await params;
  const year = Number(yearStr);
  const month = Number(monthStr);

  const user = await requireUser();
  const scope = await employeeScopeWhere(user);
  const canEdit = canWrite(user.roles, "payroll");

  const employee = await prisma.employee.findFirst({
    where: { AND: [{ id: employeeId }, scope] },
  });
  if (!employee || month < 1 || month > 12) notFound();

  const savedPayslip = await prisma.payslip.findUnique({
    where: { employeeId_year_month: { employeeId, year, month } },
  });
  // Quem não pode gerar recibos só vê o que já foi gerado — nunca a
  // pré-visualização calculada na hora de um mês ainda por processar.
  if (!canEdit && !savedPayslip) notFound();

  const [layout, branding, ytdPayslips] = await Promise.all([
    getPayslipLayoutSettings(),
    getDocumentBranding(),
    prisma.payslip.findMany({ where: { employeeId, year, month: { lte: month } } }),
  ]);
  const breakdown = savedPayslip ?? toPayslipRecord(await computePayslipBreakdown(employeeId, year, month));
  const isSaved = !!savedPayslip;
  const lines = buildPayslipLines(breakdown, layout.lineItems, false, true);
  const earningsLines = lines.filter((l) => l.section === "EARNINGS");
  const deductionLines = lines.filter((l) => l.section === "DEDUCTIONS");

  const ytdGross = ytdPayslips.reduce((sum, p) => sum + p.grossTotal, 0);
  const ytdIrs = ytdPayslips.reduce((sum, p) => sum + p.irsWithholding, 0);
  const ytdSocialSecurity = ytdPayslips.reduce((sum, p) => sum + p.socialSecurityEmployee, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={ReceiptText}
        title={`Recibo — ${MONTH_NAMES[month - 1]} de ${year}`}
        description={`${employee.firstName} ${employee.lastName} · ${employee.jobTitle}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isSaved && (
              <Badge color="green">Gerado {savedPayslip!.generatedAt.toLocaleDateString("pt-PT")}</Badge>
            )}
            {isSaved && savedPayslip!.regenerationCount > 0 && (
              <Badge color="amber">
                Regerado {savedPayslip!.regenerationCount}x — última vez {savedPayslip!.regeneratedAt?.toLocaleDateString("pt-PT")}
              </Badge>
            )}
            {isSaved && savedPayslip!.emailSentAt && (
              <Badge color="blue">Enviado por email {savedPayslip!.emailSentAt.toLocaleDateString("pt-PT")}</Badge>
            )}
            {!isSaved && <Badge color="amber">Pré-visualização — ainda não gerado</Badge>}
          </div>
        }
      />

      {breakdown.belowMinimumWage && (
        <Card className="mb-6 border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10">
          <p className="text-sm text-rose-800">
            ⚠ O salário base está abaixo do salário mínimo nacional configurado
            nos pressupostos. Verifique o contrato deste colaborador.
          </p>
        </Card>
      )}

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Vencimentos</h2>
        <Rows rows={earningsLines.map((l) => [l.label, l.value] as [string, number])} />

        <h2 className="mb-3 mt-6 text-sm font-semibold text-stone-900 dark:text-stone-100">Descontos</h2>
        <Rows rows={deductionLines.map((l) => [l.label, l.value] as [string, number])} />

        <div className="mt-6 space-y-1 border-t border-stone-200 pt-4 text-right dark:border-stone-800">
          <p className="text-sm text-stone-600 dark:text-stone-400">Total bruto: <span className="font-medium text-stone-900 dark:text-stone-100">{fmt(breakdown.grossTotal)}</span></p>
          <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">Total líquido: {fmt(breakdown.netTotal)}</p>
        </div>
      </Card>

      <Card className="mb-6 border-stone-200 bg-stone-50 dark:border-stone-800">
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Horas trabalhadas no período: {breakdown.workedHours.toFixed(1)}h em {breakdown.workedDays} dia(s) ·
          Estimativa calculada a partir de picagens, horário publicado e contrato ativo. Não substitui um
          processamento de salários certificado.
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        {canEdit && (
          <GeneratePayslipButton
            employeeId={employeeId}
            year={year}
            month={month}
            label={isSaved ? "Gerar novamente" : "Gerar recibo"}
            isRegenerate={isSaved}
          />
        )}
        {canEdit && isSaved && (
          <SendPayslipEmailButton employeeId={employeeId} year={year} month={month} />
        )}
        {isSaved && (
          <PayslipPdfButton
            data={{
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
              earnings: earningsLines.map((l) => ({ label: l.label, value: l.value })),
              deductions: deductionLines.map((l) => ({ label: l.label, value: l.value })),
              grossTotal: breakdown.grossTotal,
              netTotal: breakdown.netTotal,
              employerCost: breakdown.employerCost,
              ytdGross,
              ytdIrs,
              ytdSocialSecurity,
            }}
          />
        )}
      </div>
    </div>
  );
}

function Rows({ rows }: { rows: ([string, number] | null)[] }) {
  const visible = rows.filter((r): r is [string, number] => r !== null);
  return (
    <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-800">
      {visible.map(([label, value]) => (
        <li key={label} className="flex items-center justify-between py-2">
          <span className="text-stone-600 dark:text-stone-400">{label}</span>
          <span className={value < 0 ? "text-rose-600 dark:text-rose-400" : "text-stone-900 dark:text-stone-100"}>{fmt(value)}</span>
        </li>
      ))}
    </ul>
  );
}

function fmt(value: number): string {
  return `${value.toFixed(2)} €`;
}
