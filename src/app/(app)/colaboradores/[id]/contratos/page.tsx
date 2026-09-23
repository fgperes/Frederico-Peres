import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite, canRead } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { ColaboradorTabs } from "../tabs";
import { getContractTypeLabels } from "@/lib/contract-types";
import { endEmployeeContract } from "@/app/(app)/contratos/actions";
import { AssignContractForm } from "@/app/(app)/contratos/assign-contract-form";
import { notFound, redirect } from "next/navigation";
import { User } from "lucide-react";
import Link from "next/link";

export default async function ColaboradorContratosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!canRead(user.roles, "contratos")) redirect(`/colaboradores/${id}`);
  const scope = await employeeScopeWhere(user);

  const employee = await prisma.employee.findFirst({ where: { AND: [{ id }, scope] } });
  if (!employee) notFound();

  const canEdit = canWrite(user.roles, "contratos");
  const [assignments, activeProfiles, contractTypeLabels] = await Promise.all([
    prisma.employeeContract.findMany({
      where: { employeeId: employee.id },
      include: { contractProfile: true },
      orderBy: { startDate: "desc" },
    }),
    canEdit
      ? prisma.contractProfile.findMany({ where: { active: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    getContractTypeLabels(),
  ]);
  const active = assignments.find((a) => a.status === "ACTIVE");
  const history = assignments.filter((a) => a.id !== active?.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={User}
        title={`${employee.firstName} ${employee.lastName}`}
        description={employee.jobTitle}
      />

      <ColaboradorTabs employeeId={employee.id} />

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Contrato Atual
          </h2>
          {active && (
            <Link
              href={`/contratos/${active.contractProfileId}`}
              className="text-xs font-medium text-violet-700 hover:underline dark:text-violet-400"
            >
              Ver perfil do contrato
            </Link>
          )}
        </div>

        {!active ? (
          <EmptyState message="Sem contrato ativo. Atribua um contrato abaixo para definir vínculo, horas semanais e vencimento base." />
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <Info label="Contrato" value={active.contractProfile.name} />
              <Info
                label="Tipo de contrato"
                value={contractTypeLabels[active.contractProfile.contractType] ?? active.contractProfile.contractType}
              />
              <Info label="Horas semanais" value={`${active.contractProfile.weeklyHours}h`} />
              <Info label="Folgas semanais" value={`${active.contractProfile.weeklyRestDays}`} />
              <Info label="Data de início" value={active.startDate.toLocaleDateString("pt-PT")} />
              <Info
                label="Fim período experimental"
                value={active.trialPeriodEndDate ? active.trialPeriodEndDate.toLocaleDateString("pt-PT") : "—"}
              />
              <Info
                label="Vencimento base (para o Payroll)"
                value={active.baseSalary ? `${active.baseSalary.toFixed(2)} €` : "—"}
              />
              <Info label="Documento" value={active.documentName ?? "—"} />
              {active.notes && <Info label="Notas" value={active.notes} className="sm:col-span-2" />}
            </dl>

            {canEdit && (
              <form action={endEmployeeContract.bind(null, active.id)} className="mt-4">
                <button type="submit" className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                  Rescindir
                </button>
              </form>
            )}
          </>
        )}

        <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">
          A remuneração variável (prémios, comissões) continua a ser gerida no separador Payroll.
        </p>
      </Card>

      {canEdit && (
        <Card className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
            {active ? "Mudar de Contrato" : "Atribuir Contrato"}
          </h2>
          {activeProfiles.length === 0 ? (
            <EmptyState message="Sem contratos ativos disponíveis. Crie um em Contratos → Novo Contrato." />
          ) : (
            <AssignContractForm
              employeeId={employee.id}
              profiles={activeProfiles.map((p) => ({
                id: p.id,
                name: p.name,
                contractTypeLabel: contractTypeLabels[p.contractType] ?? p.contractType,
                weeklyHours: p.weeklyHours,
              }))}
            />
          )}
        </Card>
      )}

      {history.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
            Histórico de Contratos
          </h2>
          <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-800">
            {history.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5">
                <Link href={`/contratos/${a.contractProfileId}`} className="text-violet-700 hover:underline dark:text-violet-400">
                  {a.contractProfile.name} — {contractTypeLabels[a.contractProfile.contractType] ?? a.contractProfile.contractType}
                </Link>
                <span className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  {a.startDate.toLocaleDateString("pt-PT")} — {a.endDate ? a.endDate.toLocaleDateString("pt-PT") : "—"}
                  <Badge color="slate">Encerrado</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="mt-0.5 text-stone-900 dark:text-stone-100">{value}</dd>
    </div>
  );
}
