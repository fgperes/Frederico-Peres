import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, StatCard, Badge, LinkButton, EmptyState } from "@/components/ui";
import { ROLE_LABELS, accessFor, canRead, isSystemAdmin } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { describeAuditLog } from "@/lib/audit-labels";
import { AvatarImage } from "@/lib/avatars";
import { formatDateTime } from "@/lib/format";
import { getVisibleNews } from "@/lib/news";
import { getTodaysAnniversaries, getMyAlreadyCommentedKeys, getUpcomingAbsences } from "@/lib/anniversaries";
import { getModuleSubscription } from "@/lib/subscriptions";
import { AnniversaryWidget } from "./anniversary-widget";
import Link from "next/link";
import { addDays } from "date-fns";
import {
  Users,
  PalmtreeIcon,
  FileSignature,
  Fingerprint,
  Activity,
  CalendarClock,
  AlertTriangle,
  Megaphone,
  Building2,
  UserX,
  Cake,
  ClipboardCheck,
  CalendarDays,
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
  const userIsSystemAdmin = isSystemAdmin(user.roles);

  const [todaysAnniversaries, subscription] = await Promise.all([
    getTodaysAnniversaries(),
    getModuleSubscription(),
  ]);
  const alreadyCommentedKeys = await getMyAlreadyCommentedKeys(user.id, todaysAnniversaries);

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
      <NewsSection roles={user.roles} />

      {(todaysAnniversaries.length > 0 || userIsSystemAdmin) && (
        <Card className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
            <Cake size={16} className="text-stone-500" />
            Aniversários de hoje
          </h2>
          <AnniversaryWidget
            entries={todaysAnniversaries}
            alreadyCommentedKeys={alreadyCommentedKeys}
            currentEmployeeId={user.employeeId}
            isSystemAdmin={userIsSystemAdmin}
            workAnniversaryEnabled={subscription.workAnniversaryEnabled}
          />
        </Card>
      )}

      {isManagement ? <ManagementDashboard user={user} /> : <ColaboradorDashboard user={user} />}
    </div>
  );
}

function UpcomingAbsencesCard({
  absences,
}: {
  absences: Awaited<ReturnType<typeof getUpcomingAbsences>>;
}) {
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
        <CalendarDays size={16} className="text-stone-500" />
        Próximas ausências
      </h2>
      {absences.length === 0 ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">Sem ausências agendadas.</p>
      ) : (
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {absences.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <Link
                  href={`/colaboradores/${a.employeeId}`}
                  className="font-medium text-violet-700 hover:underline dark:text-violet-400"
                >
                  {a.employeeName}
                </Link>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {a.startDate.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}
                  {a.startDate.getTime() !== a.endDate.getTime()
                    ? ` a ${a.endDate.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}`
                    : ""}
                </p>
              </div>
              <Badge color={a.isVacation ? "blue" : "slate"}>{a.typeName}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

async function NewsSection({ roles }: { roles: string[] }) {
  const news = await getVisibleNews(roles);
  if (news.length === 0) return null;

  return (
    <Card className="mb-8">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
        <Megaphone size={16} className="text-stone-500" />
        Notícias
      </h2>
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {news.map((n) => (
          <li key={n.id} className="py-3 first:pt-0 last:pb-0">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{n.subject}</p>
              <span className="shrink-0 text-[11px] text-stone-400">{formatDateTime(n.createdAt)}</span>
            </div>
            <div
              className="prose prose-sm max-w-none text-sm text-stone-700 dark:text-stone-300"
              dangerouslySetInnerHTML={{ __html: n.bodyHtml }}
            />
            <p className="mt-1 text-[11px] text-stone-400">por {n.author.name}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

async function ManagementDashboard({
  user,
}: {
  user: Awaited<ReturnType<typeof requireUser>>;
}) {
  const scope = await employeeScopeWhere(user);
  const canAusencias = canRead(user.roles, "ausencias");
  const canFerias = canRead(user.roles, "ferias");
  const canContratos = canRead(user.roles, "contratos");
  const canPicagens = canRead(user.roles, "picagens");
  const canAvaliacoes = canRead(user.roles, "avaliacoes");
  const canAcessos = canRead(user.roles, "acessos");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Datas de nascimento/admissão são guardadas à meia-noite UTC — usar o
  // mês UTC evita desalinhar um dia consoante o fuso horário do servidor.
  const currentMonth = today.getUTCMonth();

  const [
    teamEmployees,
    pendingAusencias,
    pendingFerias,
    expiringContracts,
    openDeviations,
    overdueEvaluations,
    absentToday,
    recentAudit,
    departments,
    upcomingAbsences,
  ] = await Promise.all([
    // Lista leve do âmbito do utilizador — alimenta o total, o gráfico por
    // departamento e os aniversários, sem repetir a mesma consulta 3 vezes.
    prisma.employee.findMany({
      where: { ...scope, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, departmentId: true, birthDate: true, hireDate: true },
    }),
    canAusencias
      ? prisma.absence.count({ where: { employee: scope, status: "PENDING", absenceType: { isVacation: false } } })
      : 0,
    canFerias
      ? prisma.absence.count({ where: { employee: scope, status: "PENDING", absenceType: { isVacation: true } } })
      : 0,
    canContratos
      ? prisma.employeeContract.count({
          where: {
            employee: scope,
            status: "ACTIVE",
            endDate: { not: null, lte: addDays(new Date(), 30) },
          },
        })
      : 0,
    canPicagens
      ? prisma.timeClockEntry.count({
          where: {
            employee: scope,
            hasDeviation: true,
            justificationStatus: "PENDING",
          },
        })
      : 0,
    canAvaliacoes
      ? prisma.evaluation.count({
          where: { employee: scope, status: "SCHEDULED", scheduledDate: { lte: new Date() } },
        })
      : 0,
    canAusencias || canFerias
      ? prisma.absence.findMany({
          where: { employee: scope, status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
          include: { employee: { select: { id: true, firstName: true, lastName: true } }, absenceType: { select: { name: true, isVacation: true } } },
          take: 8,
        })
      : [],
    canAcessos
      ? prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: true } })
      : [],
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    canAusencias || canFerias ? getUpcomingAbsences(scope) : Promise.resolve([]),
  ]);

  const employeeCount = teamEmployees.length;

  const deptNameById = new Map(departments.map((d) => [d.id, d.name]));
  const countByDept = new Map<string, number>();
  for (const e of teamEmployees) {
    const key = e.departmentId ?? "__none__";
    countByDept.set(key, (countByDept.get(key) ?? 0) + 1);
  }
  const deptBars = [...countByDept.entries()]
    .map(([deptId, count]) => ({
      id: deptId === "__none__" ? null : deptId,
      name: deptId === "__none__" ? "Sem departamento" : (deptNameById.get(deptId) ?? "—"),
      count,
    }))
    .sort((a, b) => b.count - a.count);
  const maxDeptCount = Math.max(1, ...deptBars.map((d) => d.count));

  const birthdaysThisMonth = teamEmployees
    .filter((e) => e.birthDate && e.birthDate.getUTCMonth() === currentMonth)
    .map((e) => ({ ...e, day: e.birthDate!.getUTCDate(), kind: "aniversário" as const }))
    .sort((a, b) => a.day - b.day);
  const anniversariesThisMonth = teamEmployees
    .filter(
      (e) => e.hireDate && e.hireDate.getUTCMonth() === currentMonth && e.hireDate.getUTCFullYear() < today.getUTCFullYear()
    )
    .map((e) => ({
      ...e,
      day: e.hireDate!.getUTCDate(),
      years: today.getUTCFullYear() - e.hireDate!.getUTCFullYear(),
      kind: "casa" as const,
    }))
    .sort((a, b) => a.day - b.day);

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Colaboradores ativos"
          value={employeeCount}
          icon={Users}
          accent="violet"
          href="/colaboradores?status=ACTIVE"
        />
        {canFerias && (
          <StatCard
            label="Férias pendentes"
            value={pendingFerias}
            icon={PalmtreeIcon}
            accent="amber"
            href="/ferias/aprovacoes"
          />
        )}
        {canAusencias && (
          <StatCard
            label="Ausências pendentes"
            value={pendingAusencias}
            icon={FileSignature}
            accent="sky"
            href="/ausencias"
          />
        )}
        {canContratos && (
          <StatCard
            label="Contratos a expirar (30d)"
            value={expiringContracts}
            icon={FileSignature}
            accent="rose"
            href="/contratos?horizon=30"
          />
        )}
        {canPicagens && (
          <StatCard
            label="Desvios de picagem por rever"
            value={openDeviations}
            icon={Fingerprint}
            accent="sky"
            href="/picagens/execucao"
          />
        )}
        {canAvaliacoes && (
          <StatCard
            label="Avaliações atrasadas"
            value={overdueEvaluations}
            icon={ClipboardCheck}
            accent="rose"
            href="/avaliacoes"
          />
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
            <Building2 size={16} className="text-stone-500" />
            Colaboradores por departamento
          </h2>
          {deptBars.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Sem colaboradores no seu âmbito.</p>
          ) : (
            <ul className="space-y-2.5">
              {deptBars.map((d) => (
                <li key={d.id ?? "none"}>
                  <Link
                    href={d.id ? `/colaboradores?departmentId=${d.id}` : "/colaboradores"}
                    title={`${d.count} colaborador(es) em ${d.name}`}
                    className="group block"
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-stone-700 group-hover:text-violet-700 dark:text-stone-300 dark:group-hover:text-violet-400">
                        {d.name}
                      </span>
                      <span className="text-stone-500 dark:text-stone-400">{d.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all group-hover:bg-violet-600"
                        style={{ width: `${Math.max(4, (d.count / maxDeptCount) * 100)}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {(canAusencias || canFerias) && (
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
              <UserX size={16} className="text-stone-500" />
              Ausentes hoje
            </h2>
            {absentToday.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">Ninguém ausente hoje no seu âmbito.</p>
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {absentToday.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link
                      href={`/colaboradores/${a.employee.id}`}
                      className="font-medium text-violet-700 hover:underline dark:text-violet-400"
                    >
                      {a.employee.firstName} {a.employee.lastName}
                    </Link>
                    <Badge color={a.absenceType.isVacation ? "blue" : "slate"}>{a.absenceType.name}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(canAusencias || canFerias) && <UpcomingAbsencesCard absences={upcomingAbsences} />}

        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
            <Cake size={16} className="text-stone-500" />
            Este mês — {MONTH_NAMES[currentMonth]}
          </h2>
          {birthdaysThisMonth.length === 0 && anniversariesThisMonth.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Sem aniversários este mês no seu âmbito.</p>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {birthdaysThisMonth.map((e) => (
                <li key={`b-${e.id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/colaboradores/${e.id}`} className="font-medium text-violet-700 hover:underline dark:text-violet-400">
                    {e.firstName} {e.lastName}
                  </Link>
                  <span className="text-xs text-stone-500 dark:text-stone-400">🎂 dia {e.day}</span>
                </li>
              ))}
              {anniversariesThisMonth.map((e) => (
                <li key={`a-${e.id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/colaboradores/${e.id}`} className="font-medium text-violet-700 hover:underline dark:text-violet-400">
                    {e.firstName} {e.lastName}
                  </Link>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    🎉 {e.years} ano{e.years === 1 ? "" : "s"} de casa · dia {e.day}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {canAcessos && (
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
              <Activity size={16} className="text-stone-500" />
              Atividade recente (auditoria)
            </h2>
            {recentAudit.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">Sem atividade registada.</p>
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {recentAudit.map((log) => {
                  const { sentence, color } = describeAuditLog(log);
                  return (
                    <li key={log.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge color={color}>{log.user?.name ?? "Sistema"}</Badge>
                        <span className="text-stone-700 dark:text-stone-300">{sentence}</span>
                      </div>
                      <div className="shrink-0 text-right text-xs text-stone-500 dark:text-stone-400">
                        {formatDateTime(log.createdAt)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>
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

  const [nextShift, feriasBalance, pendingAbsences, unjustifiedDeviations, upcomingAbsences] = await Promise.all([
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
    // Âmbito "própria ficha" — mostra ambos os tipos (ausências e férias).
    getUpcomingAbsences({ id: user.employeeId }),
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
          href="/escalas"
        />
        <StatCard
          label="Dias de férias disponíveis"
          value={feriasDisponiveis !== null ? feriasDisponiveis.toFixed(1) : "—"}
          icon={PalmtreeIcon}
          accent="amber"
          href="/ferias"
        />
        <StatCard
          label="Os meus pedidos pendentes"
          value={pendingAbsences}
          icon={FileSignature}
          accent="sky"
          href="/ausencias"
        />
        <StatCard
          label="Picagens por justificar"
          value={unjustifiedDeviations}
          icon={AlertTriangle}
          accent="rose"
          href="/picagens"
        />
      </div>

      <div className="mb-8">
        <UpcomingAbsencesCard absences={upcomingAbsences} />
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Acesso rápido</h2>
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
