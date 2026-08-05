import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, StatCard, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ROLE_LABELS, accessFor, canRead } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { describeAuditLog } from "@/lib/audit-labels";
import { AvatarImage } from "@/lib/avatars";
import { formatDateTime } from "@/lib/format";
import { addDays } from "date-fns";
import {
  Users,
  PalmtreeIcon,
  FileSignature,
  Fingerprint,
  Activity,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, avatarKey: true, avatarImage: true },
  });

  // A hierarquia de perfis decide qual painel ver: quem só tem o perfil
  // Colaborador (âmbito "own" em recursos) vê o seu painel pessoal; todos
  // os restantes perfis (com âmbito "ro"/"rw" — Gestor, RH, Auditor, etc.)
  // veem o painel de gestão, sempre restrito ao seu âmbito de dados.
  const isManagement = accessFor(user.roles, "recursos") !== "own";

  return (
    <div>
      <PageHeader
        avatar={
          <AvatarImage
            avatarKey={dbUser?.avatarKey}
            avatarImage={dbUser?.avatarImage}
            name={user.name ?? ""}
            size={40}
          />
        }
        title={`Bem-vindo, ${user.name?.split(" ")[0]}`}
        description={`Perfis: ${user.roles.map((r) => ROLE_LABELS[r]).join(", ")}`}
      />
      {isManagement ? <ManagementDashboard user={user} /> : <ColaboradorDashboard user={user} />}
    </div>
  );
}

async function ManagementDashboard({
  user,
}: {
  user: Awaited<ReturnType<typeof requireUser>>;
}) {
  const scope = await employeeScopeWhere(user);

  const [employeeCount, pendingAbsences, expiringContracts, openDeviations, recentAudit] =
    await Promise.all([
      prisma.employee.count({ where: { ...scope, status: "ACTIVE" } }),
      canRead(user.roles, "ausencias")
        ? prisma.absence.count({ where: { employee: scope, status: "PENDING" } })
        : 0,
      canRead(user.roles, "contratos")
        ? prisma.contract.count({
            where: {
              employee: scope,
              status: "ACTIVE",
              endDate: { not: null, lte: addDays(new Date(), 30) },
            },
          })
        : 0,
      canRead(user.roles, "picagens")
        ? prisma.timeClockEntry.count({
            where: {
              employee: scope,
              hasDeviation: true,
              justificationStatus: "PENDING",
            },
          })
        : 0,
      canRead(user.roles, "acessos")
        ? prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: true } })
        : [],
    ]);

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Colaboradores ativos" value={employeeCount} icon={Users} accent="violet" />
        {canRead(user.roles, "ausencias") && (
          <StatCard
            label="Ausências pendentes"
            value={pendingAbsences}
            icon={PalmtreeIcon}
            accent="amber"
          />
        )}
        {canRead(user.roles, "contratos") && (
          <StatCard
            label="Contratos a expirar (30d)"
            value={expiringContracts}
            icon={FileSignature}
            accent="rose"
          />
        )}
        {canRead(user.roles, "picagens") && (
          <StatCard
            label="Desvios de picagem por rever"
            value={openDeviations}
            icon={Fingerprint}
            accent="sky"
          />
        )}
      </div>

      {canRead(user.roles, "acessos") && (
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900">
            <Activity size={16} className="text-stone-500" />
            Atividade recente (auditoria)
          </h2>
          {recentAudit.length === 0 ? (
            <p className="text-sm text-stone-500">Sem atividade registada.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {recentAudit.map((log) => {
                const { sentence, color } = describeAuditLog(log);
                return (
                  <li key={log.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge color={color}>{log.user?.name ?? "Sistema"}</Badge>
                      <span className="text-stone-700">{sentence}</span>
                    </div>
                    <div className="shrink-0 text-right text-xs text-stone-500">
                      {formatDateTime(log.createdAt)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}

async function ColaboradorDashboard({
  user,
}: {
  user: Awaited<ReturnType<typeof requireUser>>;
}) {
  if (!user.employeeId) {
    return <EmptyState message="Não existe uma ficha de colaborador associada à sua conta." />;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();

  const [nextShift, feriasBalance, pendingAbsences, unjustifiedDeviations] = await Promise.all([
    prisma.shift.findFirst({
      where: { employeeId: user.employeeId, date: { gte: today }, status: "PUBLISHED" },
      orderBy: { date: "asc" },
      include: { shiftTemplate: true },
    }),
    prisma.absenceBalance.findFirst({
      where: { employeeId: user.employeeId, year, absenceType: { name: "Férias" } },
    }),
    prisma.absence.count({ where: { employeeId: user.employeeId, status: "PENDING" } }),
    prisma.timeClockEntry.count({
      where: { employeeId: user.employeeId, hasDeviation: true, justification: null },
    }),
  ]);

  const feriasDisponiveis = feriasBalance
    ? feriasBalance.entitledDays - feriasBalance.usedDays - feriasBalance.plannedDays
    : null;

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Próximo turno"
          value={
            nextShift
              ? `${nextShift.date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}`
              : "—"
          }
          hint={nextShift ? `${nextShift.startTime} - ${nextShift.endTime}` : "Sem turnos publicados"}
          icon={CalendarClock}
          accent="violet"
        />
        <StatCard
          label="Dias de férias disponíveis"
          value={feriasDisponiveis !== null ? feriasDisponiveis.toFixed(1) : "—"}
          icon={PalmtreeIcon}
          accent="amber"
        />
        <StatCard
          label="Os meus pedidos pendentes"
          value={pendingAbsences}
          icon={FileSignature}
          accent="sky"
        />
        <StatCard
          label="Picagens por justificar"
          value={unjustifiedDeviations}
          icon={AlertTriangle}
          accent="rose"
        />
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-stone-900">Acesso rápido</h2>
        <div className="flex flex-wrap gap-3">
          <LinkButton href="/picagens" variant="secondary">Registar picagem</LinkButton>
          <LinkButton href="/ausencias" variant="secondary">Pedir ausência</LinkButton>
          <LinkButton href="/horarios" variant="secondary">Ver horário</LinkButton>
          <LinkButton href="/contratos" variant="secondary">O meu contrato</LinkButton>
        </div>
      </Card>
    </>
  );
}
