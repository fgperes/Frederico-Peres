import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge, LinkButton, EmptyState } from "@/components/ui";
import Link from "next/link";
import { addDays } from "date-fns";
import { FileSignature } from "lucide-react";

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  SEM_TERMO: "Sem termo",
  TERMO_CERTO: "Termo certo",
  TERMO_INCERTO: "Termo incerto",
  PRESTACAO_SERVICOS: "Prestação de serviços",
  PART_TIME: "Part-time",
};

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

  const [contracts, expiring] = await Promise.all([
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
  ]);

  return (
    <div>
      <PageHeader
        icon={FileSignature}
        title="Contratos de Trabalho"
        description="Dados contratuais, aditamentos e alertas de prazos."
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
                — {CONTRACT_TYPE_LABELS[c.contractType]} — termina em{" "}
                {c.endDate?.toLocaleDateString("pt-PT")}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-0">
        {contracts.length === 0 ? (
          <div className="p-6"><EmptyState message="Sem contratos registados." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Início</th>
                  <th className="px-4 py-3">Fim</th>
                  <th className="px-4 py-3">Horas/semana</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <Link href={`/contratos/${c.id}`} className="font-medium text-violet-700 hover:underline">
                        {c.employee.firstName} {c.employee.lastName}
                      </Link>
                      {c.version > 1 && <span className="ml-2 text-xs text-stone-500">v{c.version}</span>}
                    </td>
                    <td className="px-4 py-3">{CONTRACT_TYPE_LABELS[c.contractType] ?? c.contractType}</td>
                    <td className="px-4 py-3">{c.startDate.toLocaleDateString("pt-PT")}</td>
                    <td className="px-4 py-3">{c.endDate ? c.endDate.toLocaleDateString("pt-PT") : "—"}</td>
                    <td className="px-4 py-3">{c.weeklyHours}h</td>
                    <td className="px-4 py-3">
                      <Badge color={c.status === "ACTIVE" ? "green" : c.status === "EXPIRED" ? "amber" : "slate"}>
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
