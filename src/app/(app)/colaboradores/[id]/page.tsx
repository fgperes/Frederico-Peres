import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite, canRead } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge, Button, LinkButton } from "@/components/ui";
import { EmployeeForm } from "../employee-form";
import { ColaboradorTabs } from "./tabs";
import { updateEmployee, setEmployeeStatus } from "../actions";
import {
  ID_DOCUMENT_TYPE_LABELS,
  EDUCATION_LEVEL_LABELS,
  type IdDocumentType,
  type EducationLevel,
} from "@/lib/employee-constants";
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
        description={
          employee.employeeNumber
            ? `${employee.jobTitle} · Nº ${employee.employeeNumber}`
            : employee.jobTitle
        }
        action={
          <div className="flex flex-wrap items-center gap-3">
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
    employeeNumber: string | null;
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
    idDocumentIssuePlace: string | null;
    nationality: string | null;
    educationLevel: string | null;
    childrenCount: number | null;
    mobilePhone: string | null;
    locality: string | null;
    postalCode: string | null;
    country: string | null;
    bloodType: string | null;
    emergencyContact1Name: string | null;
    emergencyContact1Phone: string | null;
    emergencyContact2Name: string | null;
    emergencyContact2Phone: string | null;
  };
}) {
  const isExpired =
    !employee.idDocumentNoExpiry &&
    !!employee.idDocumentExpiry &&
    employee.idDocumentExpiry < new Date();

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <Info label="Número de Colaborador" value={employee.employeeNumber ?? "—"} />
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
        <Info label="Local de emissão" value={employee.idDocumentIssuePlace ?? "—"} />
        <Info label="Nacionalidade" value={employee.nationality ?? "—"} />
        <Info
          label="Habilitações literárias"
          value={
            employee.educationLevel
              ? EDUCATION_LEVEL_LABELS[employee.educationLevel as EducationLevel]
              : "—"
          }
        />
        <Info label="Número de filhos" value={String(employee.childrenCount ?? 0)} />
      </dl>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Contactos</h3>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <Info label="Telemóvel" value={employee.mobilePhone ?? "—"} />
          <Info label="Localidade" value={employee.locality ?? "—"} />
          <Info label="Código-postal" value={employee.postalCode ?? "—"} />
          <Info label="País" value={employee.country ?? "—"} />
        </dl>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Emergências</h3>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <Info label="Tipo de sangue" value={employee.bloodType ?? "—"} />
          <Info label="Contacto 1" value={[employee.emergencyContact1Name, employee.emergencyContact1Phone].filter(Boolean).join(" · ") || "—"} />
          <Info label="Contacto 2" value={[employee.emergencyContact2Name, employee.emergencyContact2Phone].filter(Boolean).join(" · ") || "—"} />
        </dl>
      </div>
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
