import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, LinkButton, EmptyState } from "@/components/ui";
import Link from "next/link";
import { addDays } from "date-fns";
import { FileSignature } from "lucide-react";
import { getContractTypeLabels } from "@/lib/contract-types";
import { ContractGroupsTable, type ContractGroup } from "./contract-groups-table";

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ horizon?: string }>;
}) {
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "contratos");
  const scope = await employeeScopeWhere(user);
  const params = await searchParams;
  const horizonDays = Number(params.horizon ?? 30);

  const scopedEmployees = await prisma.employee.findMany({ where: scope });
  const employeeIds = scopedEmployees.map((e) => e.id);

  const [contracts, expiring, contractTypeLabels] = await Promise.all([
    prisma.contract.findMany({
      where: { employeeId: { in: employeeIds } },
      include: { employee: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contract.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: "ACTIVE",
        endDate: { not: null, lte: addDays(new Date(), horizonDays) },
      },
      include: { employee: true },
      orderBy: { endDate: "asc" },
    }),
    getContractTypeLabels(),
  ]);

  // Um "contrato" nesta listagem é um perfil de condições (tipo + horas +
  // folgas semanais) — pode aplicar-se a vários colaboradores, por isso
  // aparece agrupado uma única vez, com todos os colaboradores que se
  // enquadram nessa condição por baixo.
  const groupsByKey = new Map<string, ContractGroup>();
  for (const c of contracts) {
    const key = `${c.contractType}|${c.weeklyHours}|${c.weeklyRestDays}`;
    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        key,
        contractTypeLabel: contractTypeLabels[c.contractType] ?? c.contractType,
        weeklyHours: c.weeklyHours,
        weeklyRestDays: c.weeklyRestDays,
        entries: [],
      });
    }
    groupsByKey.get(key)!.entries.push({
      id: c.id,
      employeeId: c.employeeId,
      employeeName: `${c.employee.firstName} ${c.employee.lastName}`,
      startDate: c.startDate.toLocaleDateString("pt-PT"),
      endDate: c.endDate ? c.endDate.toLocaleDateString("pt-PT") : null,
      status: c.status,
      version: c.version,
    });
  }
  const groups = Array.from(groupsByKey.values()).sort(
    (a, b) => a.contractTypeLabel.localeCompare(b.contractTypeLabel) || a.weeklyHours - b.weeklyHours
  );

  return (
    <div>
      <PageHeader
        icon={FileSignature}
        title="Contratos de Trabalho"
        description="Dados contratuais, aditamentos e alertas de prazos."
        action={canEdit && <LinkButton href="/contratos/novo">+ Novo Contrato</LinkButton>}
      />

      {expiring.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-amber-800">
              Contratos a expirar nos próximos {horizonDays} dias (CT-04/CT-06)
            </h2>
            <form method="get" className="flex items-center gap-2">
              <select name="horizon" defaultValue={horizonDays} className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs">
                {[15, 30, 60, 90].map((h) => (
                  <option key={h} value={h}>{h} dias</option>
                ))}
              </select>
              <button type="submit" className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700">
                Aplicar
              </button>
            </form>
          </div>
          <ul className="space-y-1 text-sm text-amber-900">
            {expiring.map((c) => (
              <li key={c.id}>
                <Link href={`/contratos/${c.id}`} className="hover:underline">
                  {c.employee.firstName} {c.employee.lastName}
                </Link>{" "}
                — {contractTypeLabels[c.contractType]} — termina em{" "}
                {c.endDate?.toLocaleDateString("pt-PT")}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-0">
        {groups.length === 0 ? (
          <div className="p-6"><EmptyState message="Sem contratos registados." /></div>
        ) : (
          <ContractGroupsTable groups={groups} />
        )}
      </Card>

      {canEdit && (
        <div className="mt-4">
          <LinkButton href="/contratos/novo">+ Novo Contrato</LinkButton>
        </div>
      )}
    </div>
  );
}
