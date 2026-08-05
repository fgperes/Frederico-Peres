import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite, canRead } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getVacationHistory } from "@/lib/vacation";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { ColaboradorTabs } from "../tabs";
import { VacationHistoryTable } from "../../../ferias/history-table";
import { CreateYearButton } from "./create-year-button";
import { notFound, redirect } from "next/navigation";
import { User, Plane } from "lucide-react";

export default async function ColaboradorFeriasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!canRead(user.roles, "ferias")) redirect(`/colaboradores/${id}`);
  const scope = await employeeScopeWhere(user);

  const employee = await prisma.employee.findFirst({ where: { AND: [{ id }, scope] } });
  if (!employee) notFound();

  const vacationHistory = await getVacationHistory(employee.id);
  const canManage = canWrite(user.roles, "ferias");
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const hasNextYear = vacationHistory.some((row) => row.year === nextYear);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={User}
        title={`${employee.firstName} ${employee.lastName}`}
        description={employee.jobTitle}
      />

      <ColaboradorTabs employeeId={employee.id} />

      {canManage && !hasNextYear && (
        <div className="mb-6">
          <CreateYearButton employeeId={employee.id} year={nextYear} />
        </div>
      )}

      {vacationHistory.length === 0 ? (
        <Card>
          <EmptyState icon={Plane} message="Sem contingentes de férias criados para este colaborador." />
        </Card>
      ) : (
        <VacationHistoryTable
          employeeId={employee.id}
          rows={vacationHistory}
          canManage={canManage}
          editableYears={(year) => year >= currentYear - 1}
        />
      )}
    </div>
  );
}
