import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { EmployeeForm } from "../employee-form";
import { updateEmployee, setEmployeeStatus } from "../actions";
import { notFound } from "next/navigation";
import { User } from "lucide-react";

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
    include: { history: { orderBy: { createdAt: "desc" }, take: 10 } },
  });

  if (!employee) notFound();

  const [departments, teams, locations, managers] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({ orderBy: { firstName: "asc" } }),
  ]);

  const canEdit = canWrite(user.roles, "recursos");
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

      <Card>
        {canEdit ? (
          <EmployeeForm
            action={boundUpdate}
            departments={departments}
            teams={teams}
            locations={locations}
            managers={managers}
            employee={employee}
          />
        ) : (
          <ReadOnlyView employee={employee} />
        )}
      </Card>

      {employee.history.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">
            Histórico de Alterações
          </h2>
          <ul className="space-y-2 text-sm">
            {employee.history.map((h) => (
              <li key={h.id} className="text-stone-600">
                <span className="font-medium">{h.field}</span>:{" "}
                {h.oldValue ?? "—"} → {h.newValue ?? "—"}{" "}
                <span className="text-xs text-stone-500">
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
  };
}) {
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
    </dl>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-stone-900">{value}</dd>
    </div>
  );
}
