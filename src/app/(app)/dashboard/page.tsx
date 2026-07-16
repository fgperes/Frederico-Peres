import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, StatCard, Badge } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/roles";
import { addDays } from "date-fns";
import { LayoutGrid, Users, PalmtreeIcon, FileSignature, Fingerprint, Activity } from "lucide-react";

export default async function DashboardPage() {
  const user = await requireUser();

  const [employeeCount, pendingAbsences, expiringContracts, openDeviations] =
    await Promise.all([
      prisma.employee.count({ where: { status: "ACTIVE" } }),
      prisma.absence.count({ where: { status: "PENDING" } }),
      prisma.contract.count({
        where: {
          status: "ACTIVE",
          endDate: { not: null, lte: addDays(new Date(), 30) },
        },
      }),
      prisma.timeClockEntry.count({
        where: { hasDeviation: true, justificationStatus: "PENDING" },
      }),
    ]);

  const recentAudit = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { user: true },
  });

  return (
    <div>
      <PageHeader
        icon={LayoutGrid}
        title={`Bem-vindo, ${user.name?.split(" ")[0]}`}
        description={`Perfis: ${user.roles.map((r) => ROLE_LABELS[r]).join(", ")}`}
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Colaboradores ativos"
          value={employeeCount}
          icon={Users}
          accent="violet"
        />
        <StatCard
          label="Ausências pendentes"
          value={pendingAbsences}
          icon={PalmtreeIcon}
          accent="amber"
        />
        <StatCard
          label="Contratos a expirar (30d)"
          value={expiringContracts}
          icon={FileSignature}
          accent="rose"
        />
        <StatCard
          label="Desvios de picagem por rever"
          value={openDeviations}
          icon={Fingerprint}
          accent="sky"
        />
      </div>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900">
          <Activity size={16} className="text-stone-400" />
          Atividade recente (auditoria)
        </h2>
        {recentAudit.length === 0 ? (
          <p className="text-sm text-stone-500">Sem atividade registada.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {recentAudit.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div>
                  <Badge color="blue">{log.action}</Badge>{" "}
                  <span className="ml-2 text-stone-700">
                    {log.entity}
                    {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                  </span>
                  {log.details && (
                    <span className="ml-2 text-stone-400">
                      — {log.details}
                    </span>
                  )}
                </div>
                <div className="text-right text-stone-400">
                  <div>{log.user?.name ?? "Sistema"}</div>
                  <div>{log.createdAt.toLocaleString("pt-PT")}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
