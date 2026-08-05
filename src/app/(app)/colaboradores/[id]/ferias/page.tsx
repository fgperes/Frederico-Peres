import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite, canRead } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getVacationHistory } from "@/lib/vacation";
import { PageHeader } from "@/components/ui";
import { ColaboradorTabs } from "../tabs";
import { FeriasPanel } from "./ferias-panel";
import { notFound, redirect } from "next/navigation";
import { User } from "lucide-react";

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

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={User}
        title={`${employee.firstName} ${employee.lastName}`}
        description={employee.jobTitle}
      />

      <ColaboradorTabs employeeId={employee.id} />

      <FeriasPanel
        employeeId={employee.id}
        initialRows={vacationHistory}
        canManage={canManage}
        currentYear={currentYear}
      />
    </div>
  );
}
