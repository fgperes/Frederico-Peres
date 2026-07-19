import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite, canRead, canManageEmployeeAccess } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge, Button, LinkButton } from "@/components/ui";
import { EmployeeForm } from "../employee-form";
import { ColaboradorTabs } from "./tabs";
import { AccessCard } from "./access-card";
import { updateEmployee, setEmployeeStatus } from "../actions";
import { ID_DOCUMENT_TYPE_LABELS, type IdDocumentType } from "@/lib/employee-constants";
import { notFound } from "next/navigation";
import { User, Banknote } from "lucide-react";

export default async function ColaboradorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const scope = await employeeScopeWhere(user);

  const employee = await prisma.employee.findFirst({
    where: { AND: [{ id }, scope] },
    include: {
      history: { orderBy: { createdAt: "desc" }, take: 10 },
      user: { include: { roles: { include: { department: true } } } },
    },
  });

  if (!employee) notFound();

  const [departments, teams, locations, managers, jobTitleRows] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({ orderBy: { firstName: "asc" } }),
    prisma.employee.findMany({
      distinct: ["jobTitle"],
      select: { jobTitle: true },
      orderBy: { jobTitle: "asc" },
    }),
  ]);
  const jobTitles = jobTitleRows.map((r) => r.jobTitle);

  const canEdit = canWrite(user.roles, "recursos");
  const canManageAccess = canManageEmployeeAccess(user.roles);
  const boundUpdate = updateEmployee.bind(null, employee.id);
  const toggleStatus = setEmployeeStatus.bind(
    null,
    employee.id,
    employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={User}
        title={`${employee.firstName} ${employee.lastName}`}
        description={employee.jobTitle}
        action={
          <div className="flex items-center gap-3">
            <Badge color={employee.status === "ACTIVE" ? "green" : "slate"}>
              {employee.status === "ACTIVE" ? "Ativo" : "Inativo"}
            </Badge>
            {canRead(user.roles, "payroll") && (
              <LinkButton href={`/payroll/${employee.id}`} variant="secondary">
                <Banknote size={14} /> Payroll
              </LinkButton>
            )}
            {canEdit && (
              <form action={toggleStatus}>
                <Button variant="secondary" type="submit">
                  {employee.status === "ACTIVE" ? "Inativar" : "Reativar"}
                </Button>
              </form>
            )}
          </div>
        }
      />

      <ColaboradorTabs employeeId={employee.id} />

      <Card>
        {canEdit ? (
          <EmployeeForm
            action={boundUpdate}
            departments={departments}
            teams={teams}
            locations={locations}
            managers={managers}
            jobTitles={jobTitles}
            employee={employee}
          />
        ) : (
          <ReadOnlyView employee={employee} />
        )}
      </Card>

      <Card className="mt-6">
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
          canManage={canManageAccess}
        />
      </Card>

      {employee.history.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
            Histórico de Alterações
          </h2>
          <ul className="space-y-2 text-sm">
            {employee.history.map((h) => (
              <li key={h.id} className="text-stone-600 dark:text-stone-400">
                <span className="font-medium">{h.field}</span>:{" "}
                {h.oldValue ?? "—"} → {h.newValue ?? "—"}{" "}
                <span className="text-xs text-stone-500 dark:text-stone-500">
                  ({h.changedBy}, {h.createdAt.toLocaleDateString("pt-PT")})
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ReadOnlyView({
  employee,
}: {
  employee: {
    email: string;
    phone: string | null;
    jobTitle: string;
    employmentType: string;
    weeklyHours: number;
    hireDate: Date | null;
    idDocument: string | null;
    idDocumentType: string | null;
    idDocumentExpiry: Date | null;
    idDocumentNoExpiry: boolean;
  };
}) {
  const isExpired =
    !employee.idDocumentNoExpiry &&
    !!employee.idDocumentExpiry &&
    employee.idDocumentExpiry < new Date();

  return (
    <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
      <Info label="Email" value={employee.email} />
      <Info label="Telefone" value={employee.phone ?? "—"} />
      <Info label="Função" value={employee.jobTitle} />
      <Info
        label="Tipo de vínculo"
        value={employee.employmentType === "FULL_TIME" ? "Full-time" : "Part-time"}
      />
      <Info label="Horas semanais" value={String(employee.weeklyHours)} />
      <Info
        label="Data de admissão"
        value={
          employee.hireDate
            ? employee.hireDate.toLocaleDateString("pt-PT")
            : "—"
        }
      />
      <Info
        label="Documento de identificação"
        value={
          employee.idDocumentType
            ? ID_DOCUMENT_TYPE_LABELS[employee.idDocumentType as IdDocumentType]
            : "—"
        }
      />
      <div>
        <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">Validade</dt>
        <dd className="mt-0.5 flex items-center gap-2 text-stone-900 dark:text-stone-100">
          {employee.idDocumentNoExpiry
            ? "Vitalício"
            : employee.idDocumentExpiry
              ? employee.idDocumentExpiry.toLocaleDateString("pt-PT")
              : "—"}
          {isExpired && <Badge color="red">Caducado</Badge>}
        </dd>
      </div>
    </dl>
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
