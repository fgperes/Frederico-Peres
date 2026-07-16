import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { computePayslipBreakdown, toPayslipRecord } from "@/lib/payroll";
import { PageHeader, Card, Badge } from "@/components/ui";
import { ReceiptText } from "lucide-react";
import { notFound } from "next/navigation";
import { GeneratePayslipButton } from "@/components/payroll/generate-payslip-button";
import { PayslipPdfButton } from "@/components/payroll/payslip-pdf-button";

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

  const breakdown = savedPayslip ?? toPayslipRecord(await computePayslipBreakdown(employeeId, year, month));
  const isSaved = !!savedPayslip;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={ReceiptText}
        title={`Recibo — ${MONTH_NAMES[month - 1]} de ${year}`}
        description={`${employee.firstName} ${employee.lastName} · ${employee.jobTitle}`}
        action={
          <div className="flex items-center gap-2">
            {isSaved && (
              <Badge color="green">Gerado {savedPayslip!.generatedAt.toLocaleDateString("pt-PT")}</Badge>
            )}
            {!isSaved && <Badge color="amber">Pré-visualização — ainda não gerado</Badge>}
          </div>
        }
      />

      {breakdown.belowMinimumWage && (
        <Card className="mb-6 border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-800">
            ⚠ O salário base está abaixo do salário mínimo nacional configurado
            nos pressupostos. Verifique o contrato deste colaborador.
          </p>
        </Card>
      )}

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-stone-900">Vencimentos</h2>
        <Rows
          rows={[
            ["Salário base", breakdown.baseSalary],
            breakdown.overtimePay > 0 ? [`Horas extra (${breakdown.overtimeHours.toFixed(1)}h)`, breakdown.overtimePay] : null,
            breakdown.mealAllowanceTotal > 0 ? ["Subsídio de alimentação", breakdown.mealAllowanceTotal] : null,
            breakdown.vacationSubsidy > 0 ? ["Subsídio de férias", breakdown.vacationSubsidy] : null,
            breakdown.christmasSubsidy > 0 ? ["Subsídio de Natal", breakdown.christmasSubsidy] : null,
            breakdown.otherEarnings > 0 ? ["Outros vencimentos", breakdown.otherEarnings] : null,
            breakdown.absenceDeduction > 0
              ? [`Desconto por faltas não remuneradas (${breakdown.absenceDeductionDays.toFixed(1)}d)`, -breakdown.absenceDeduction]
              : null,
          ]}
        />

        <h2 className="mb-3 mt-6 text-sm font-semibold text-stone-900">Descontos</h2>
        <Rows
          rows={[
            ["Segurança Social (trabalhador)", -breakdown.socialSecurityEmployee],
            ["IRS — retenção na fonte (estimativa)", -breakdown.irsWithholding],
            breakdown.otherDeductions > 0 ? ["Outros descontos", -breakdown.otherDeductions] : null,
          ]}
        />

        <div className="mt-6 space-y-1 border-t border-stone-200 pt-4 text-right">
          <p className="text-sm text-stone-600">Total bruto: <span className="font-medium text-stone-900">{fmt(breakdown.grossTotal)}</span></p>
          <p className="text-lg font-semibold text-stone-900">Total líquido: {fmt(breakdown.netTotal)}</p>
          <p className="text-xs text-stone-400">Custo total para a empresa: {fmt(breakdown.employerCost)}</p>
        </div>
      </Card>

      <Card className="mb-6 border-stone-200 bg-stone-50">
        <p className="text-xs text-stone-500">
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
            label={isSaved ? "Recalcular recibo" : "Gerar recibo"}
          />
        )}
        {isSaved && (
          <PayslipPdfButton
            data={{
              employeeName: `${employee.firstName} ${employee.lastName}`,
              nif: employee.nif,
              jobTitle: employee.jobTitle,
              year,
              month,
              baseSalary: breakdown.baseSalary,
              overtimeHours: breakdown.overtimeHours,
              overtimePay: breakdown.overtimePay,
              mealAllowanceTotal: breakdown.mealAllowanceTotal,
              vacationSubsidy: breakdown.vacationSubsidy,
              christmasSubsidy: breakdown.christmasSubsidy,
              otherEarnings: breakdown.otherEarnings,
              absenceDeduction: breakdown.absenceDeduction,
              socialSecurityEmployee: breakdown.socialSecurityEmployee,
              irsWithholding: breakdown.irsWithholding,
              otherDeductions: breakdown.otherDeductions,
              grossTotal: breakdown.grossTotal,
              netTotal: breakdown.netTotal,
              employerCost: breakdown.employerCost,
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
    <ul className="divide-y divide-stone-100 text-sm">
      {visible.map(([label, value]) => (
        <li key={label} className="flex items-center justify-between py-2">
          <span className="text-stone-600">{label}</span>
          <span className={value < 0 ? "text-rose-600" : "text-stone-900"}>{fmt(value)}</span>
        </li>
      ))}
    </ul>
  );
}

function fmt(value: number): string {
  return `${value.toFixed(2)} €`;
}
