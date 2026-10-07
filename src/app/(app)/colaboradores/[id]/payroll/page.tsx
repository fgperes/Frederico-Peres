import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRead, canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card } from "@/components/ui";
import { ColaboradorTabs } from "../tabs";
import { notFound, redirect } from "next/navigation";
import { User } from "lucide-react";
import { EmployeePayrollProfileForm } from "@/app/(app)/payroll/[employeeId]/employee-payroll-profile-form";
import { BaseSalaryForm } from "@/app/(app)/payroll/[employeeId]/base-salary-form";

function subsidyModeLabel(mode: string | null, months: string | null): string {
  if (mode === "DUODECIMOS") return "Duodécimos mensais";
  if (mode === "MONTHS") return `Meses: ${months || "—"}`;
  return "Definição global";
}

export default async function ColaboradorPayrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!canRead(user.roles, "payroll")) redirect(`/colaboradores/${id}`);
  const scope = await employeeScopeWhere(user);

  const employee = await prisma.employee.findFirst({
    where: { AND: [{ id }, scope] },
  });
  if (!employee) notFound();

  const canEdit = canWrite(user.roles, "payroll");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={User}
        title={`${employee.firstName} ${employee.lastName}`}
        description={employee.jobTitle}
      />

      <ColaboradorTabs employeeId={employee.id} />

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Vencimento Base
        </h2>
        {canEdit ? (
          <BaseSalaryForm employeeId={employee.id} baseSalary={employee.baseSalary} />
        ) : (
          <p className="text-sm text-stone-900 dark:text-stone-100">
            {employee.baseSalary ? `${employee.baseSalary.toFixed(2)} €` : "—"}
          </p>
        )}
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          Pertence ao colaborador — um aumento salarial altera só este valor, sem precisar de um novo contrato.
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Dados de Payroll
        </h2>
        {canEdit ? (
          <EmployeePayrollProfileForm employee={employee} />
        ) : (
          <dl className="space-y-2 text-sm">
            <Info label="Beneficiário ADSE" value={employee.adseBeneficiary ? "Sim" : "Não"} />
            <Info
              label="IRS Jovem"
              value={employee.youngTaxRegime ? `Sim — desde ${employee.youngTaxRegimeStartYear}` : "Não"}
            />
            <Info
              label="Desconto judicial"
              value={employee.judicialDeductionPercent ? `${employee.judicialDeductionPercent}%` : "—"}
            />
            <Info
              label="Subsídio de férias"
              value={subsidyModeLabel(employee.vacationSubsidyMode, employee.vacationSubsidyMonths)}
            />
            <Info
              label="Subsídio de Natal"
              value={subsidyModeLabel(employee.christmasSubsidyMode, employee.christmasSubsidyMonths)}
            />
          </dl>
        )}
        <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">
          Estado civil, dependentes e região fiscal ficam na ficha base do colaborador (separador Dados).
          Subsídio de alimentação e limites de isenção são definidos em Payroll → Pressupostos, para toda a empresa.
        </p>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="mt-0.5 text-stone-900 dark:text-stone-100">{value}</dd>
    </div>
  );
}
