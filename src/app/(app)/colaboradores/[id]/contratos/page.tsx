import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite, canRead } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ColaboradorTabs } from "../tabs";
import { getContractTypeLabels } from "@/lib/contract-types";
import { notFound, redirect } from "next/navigation";
import { User, Plus } from "lucide-react";

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
  const [contracts, contractTypeLabels] = await Promise.all([
    prisma.contract.findMany({
      where: { employeeId: employee.id },
      orderBy: { version: "asc" },
    }),
    getContractTypeLabels(),
  ]);
  const active = contracts.find((c) => c.status === "ACTIVE");

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
          {canEdit && (
            <LinkButton
              href={
                active
                  ? `/contratos/novo?employeeId=${employee.id}&parentContractId=${active.id}`
                  : `/contratos/novo?employeeId=${employee.id}`
              }
              variant="secondary"
            >
              <Plus size={14} /> {active ? "Criar Aditamento" : "Novo Contrato"}
            </LinkButton>
          )}
        </div>

        {!active ? (
          <EmptyState message="Sem contrato ativo. Crie um para definir vínculo, horas semanais e vencimento base." />
        ) : (
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <Info label="Tipo de contrato" value={contractTypeLabels[active.contractType] ?? active.contractType} />
            <Info label="Horas semanais" value={`${active.weeklyHours}h`} />
            <Info label="Data de início" value={active.startDate.toLocaleDateString("pt-PT")} />
            <Info label="Data de fim" value={active.endDate ? active.endDate.toLocaleDateString("pt-PT") : "—"} />
            <Info
              label="Fim período experimental"
              value={active.trialPeriodEndDate ? active.trialPeriodEndDate.toLocaleDateString("pt-PT") : "—"}
            />
            <Info
              label="Vencimento base (para o Payroll)"
              value={active.baseSalary ? `${active.baseSalary.toFixed(2)} €` : "—"}
            />
            <Info label="Folgas semanais" value={`${active.weeklyRestDays}`} />
            <Info label="Documento" value={active.documentName ?? "—"} />
            {active.notes && <Info label="Notas" value={active.notes} className="sm:col-span-2" />}
          </dl>
        )}

        <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">
          A remuneração variável (prémios, comissões) continua a ser gerida no separador Payroll.
        </p>
      </Card>

      {contracts.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
            Histórico de Versões
          </h2>
          <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-800">
            {[...contracts].reverse().map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5">
                <a href={`/contratos/${c.id}`} className="text-violet-700 hover:underline dark:text-violet-400">
                  v{c.version} — {contractTypeLabels[c.contractType] ?? c.contractType} — {c.weeklyHours}h
                </a>
                <span className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  {c.startDate.toLocaleDateString("pt-PT")}
                  <Badge color={c.status === "ACTIVE" ? "green" : c.status === "EXPIRED" ? "amber" : "slate"}>
                    {c.status}
                  </Badge>
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
