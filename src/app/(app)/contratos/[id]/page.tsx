import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, Badge, LinkButton, Button } from "@/components/ui";
import { setContractStatus } from "../actions";
import { notFound } from "next/navigation";
import { FileSignature } from "lucide-react";

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  SEM_TERMO: "Sem termo",
  TERMO_CERTO: "Termo certo",
  TERMO_INCERTO: "Termo incerto",
  PRESTACAO_SERVICOS: "Prestação de serviços",
  PART_TIME: "Part-time",
};

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "contratos");

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!contract) notFound();

  // CT-03: histórico completo de versões/aditamentos.
  const rootId = contract.parentContractId ?? contract.id;
  const allVersions = await prisma.contract.findMany({
    where: { OR: [{ id: rootId }, { parentContractId: rootId }] },
    orderBy: { version: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={FileSignature}
        title={`Contrato — ${contract.employee.firstName} ${contract.employee.lastName}`}
        description={`${CONTRACT_TYPE_LABELS[contract.contractType] ?? contract.contractType} · versão ${contract.version}`}
        action={
          <div className="flex items-center gap-2">
            <Badge color={contract.status === "ACTIVE" ? "green" : contract.status === "EXPIRED" ? "amber" : "slate"}>
              {contract.status}
            </Badge>
            {canEdit && contract.status === "ACTIVE" && (
              <>
                <form action={setContractStatus.bind(null, contract.id, "TERMINATED")}>
                  <Button variant="danger" type="submit">Rescindir</Button>
                </form>
              </>
            )}
          </div>
        }
      />

      <Card>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Início" value={contract.startDate.toLocaleDateString("pt-PT")} />
          <Info label="Fim" value={contract.endDate ? contract.endDate.toLocaleDateString("pt-PT") : "—"} />
          <Info label="Fim período experimental" value={contract.trialPeriodEndDate ? contract.trialPeriodEndDate.toLocaleDateString("pt-PT") : "—"} />
          <Info label="Horas semanais" value={`${contract.weeklyHours}h`} />
          <Info label="Folgas semanais" value={`${contract.weeklyRestDays}`} />
          <Info label="Remuneração base" value={contract.baseSalary ? `${contract.baseSalary.toFixed(2)} €` : "—"} />
          <Info label="Documento" value={contract.documentName ?? "—"} />
        </dl>
        {contract.notes && (
          <p className="mt-4 text-sm text-stone-600">
            <span className="font-medium">Notas: </span>{contract.notes}
          </p>
        )}
      </Card>

      {canEdit && (
        <div className="mt-4">
          <LinkButton
            href={`/contratos/novo?employeeId=${contract.employeeId}&parentContractId=${contract.id}`}
            variant="secondary"
          >
            + Aditamento / Renovação
          </LinkButton>
        </div>
      )}

      {allVersions.length > 1 && (
        <Card className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">Histórico de Versões</h2>
          <ul className="divide-y divide-stone-100 text-sm">
            {allVersions.map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2">
                <span>
                  v{v.version} — {CONTRACT_TYPE_LABELS[v.contractType]} — {v.weeklyHours}h
                </span>
                <span className="text-xs text-stone-500">
                  {v.startDate.toLocaleDateString("pt-PT")}
                  {v.id === contract.id && " (atual)"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
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
