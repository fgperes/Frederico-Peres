import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canManageEmployeeAccess, ROLES, ROLE_LABELS } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card } from "@/components/ui";
import { ColaboradorTabs } from "../tabs";
import { AccessCard } from "../access-card";
import { notFound } from "next/navigation";
import { User } from "lucide-react";

export default async function ColaboradorAcessosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const scope = await employeeScopeWhere(user);

  const employee = await prisma.employee.findFirst({
    where: { AND: [{ id }, scope] },
    include: { user: { include: { roles: { include: { department: true } } } } },
  });
  if (!employee) notFound();

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  const canManageAccess = canManageEmployeeAccess(user.roles);

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
          Perfis e Acessos
        </h2>
        <AccessCard
          employeeId={employee.id}
          hasUser={!!employee.user}
          userId={employee.user?.id ?? null}
          userEmail={employee.user?.email ?? null}
          userActive={employee.user?.active ?? null}
          userRoles={
            employee.user?.roles.map((r) => ({
              id: r.id,
              role: r.role,
              departmentId: r.departmentId,
              departmentName: r.department?.name ?? null,
            })) ?? []
          }
          departments={departments}
          roles={ROLES.map((key) => ({ key, label: ROLE_LABELS[key] }))}
          canManage={canManageAccess}
        />
      </Card>
    </div>
  );
}
