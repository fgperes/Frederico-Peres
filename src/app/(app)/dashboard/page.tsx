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
import { MonthlyAnniversariesList, type MonthlyAnniversaryEntry } from "./monthly-anniversaries";
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

  const [todaysAnniversaries, subscription, managementData, colaboradorData] = await Promise.all([
    getTodaysAnniversaries(),
    getModuleSubscription(),
    isManagement ? loadManagementDashboardData(user) : Promise.resolve(null),
    isManagement ? Promise.resolve(null) : loadColaboradorDashboardData(user),
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

      {managementData ? (
        <ManagementStatCards data={managementData} />
      ) : colaboradorData ? (
        <ColaboradorStatCards data={colaboradorData} />
      ) : null}

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

      <NewsSection roles={user.roles} />

      {managementData ? (
        <ManagementDashboardBody data={managementData} currentEmployeeId={user.employeeId} />
      ) : colaboradorData ? (
        <ColaboradorDashboardBody data={colaboradorData} />
      ) : (
        <EmptyState message="Não existe uma ficha de colaborador associada à sua conta." />
      )}
    </div>
  );
}

function AbsencesCard({
  today,
  upcoming,
}: {
  today?: {
    id: string;
    employee: { id: string; firstName: string; lastName: string };
    absenceType: { name: string; isVacation: boolean };
  }[];
  upcoming: Awaited<ReturnType<typeof getUpcomingAbsences>>;
}) {
  const hasToday = !!today && today.length > 0;
  const hasUpcoming = upcoming.length > 0;

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
        <CalendarDays size={16} className="text-stone-500" />
        Ausências e Férias
      </h2>
      {!hasToday && !hasUpcoming ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">Sem ausências a registar.</p>
      ) : (
        <div className="space-y-5">
          {today !== undefined && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                Hoje
              </h3>
              {hasToday ? (
                <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                  {today.map((a) => (
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
              ) : (
                <p className="text-sm text-stone-500 dark:text-stone-400">Ninguém ausente hoje.</p>
              )}
            </div>
          )}
          <div>
            {today !== undefined && (
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                Próximas
              </h3>
            )}
            {hasUpcoming ? (
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {upcoming.map((a) => (
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
            ) : (
              <p className="text-sm text-stone-500 dark:text-stone-400">Sem ausências agendadas.</p>
            )}
          </div>
        </div>
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

async function loadManagementDashboardData(user: Awaited<ReturnType<typeof requireUser>>) {
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
      select: {
        id: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        birthDate: true,
        hireDate: true,
        user: { select: { avatarKey: true, avatarImage: true } },
      },
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

  const monthlyEntries: MonthlyAnniversaryEntry[] = [
    ...teamEmployees
      .filter((e) => e.birthDate && e.birthDate.getUTCMonth() === currentMonth)
      .map((e) => ({
        employeeId: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        avatarKey: e.user?.avatarKey ?? null,
        avatarImage: e.user?.avatarImage ?? null,
        kind: "BIRTHDAY" as const,
        day: e.birthDate!.getUTCDate(),
      })),
    ...teamEmployees
      .filter(
        (e) => e.hireDate && e.hireDate.getUTCMonth() === currentMonth && e.hireDate.getUTCFullYear() < today.getUTCFullYear()
      )
      .map((e) => ({
        employeeId: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        avatarKey: e.user?.avatarKey ?? null,
        avatarImage: e.user?.avatarImage ?? null,
        kind: "WORK_ANNIVERSARY" as const,
        day: e.hireDate!.getUTCDate(),
        years: today.getUTCFullYear() - e.hireDate!.getUTCFullYear(),
      })),
  ].sort((a, b) => a.day - b.day);

  const alreadyCommentedMonthlyKeys = await getMyAlreadyCommentedKeys(
    user.id,
    monthlyEntries.map((e) => ({ employeeId: e.employeeId, kind: e.kind }))
  );

  return {
    employeeCount,
    canAusencias,
    canFerias,
    canContratos,
    canPicagens,
    canAvaliacoes,
    canAcessos,
    pendingAusencias,
    pendingFerias,
    expiringContracts,
    openDeviations,
    overdueEvaluations,
    deptBars,
    maxDeptCount,
    absentToday,
    recentAudit,
    upcomingAbsences,
    monthlyEntries,
    alreadyCommentedMonthlyKeys,
    monthName: MONTH_NAMES[currentMonth],
  };
}

function ManagementStatCards({ data }: { data: Awaited<ReturnType<typeof loadManagementDashboardData>> }) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Colaboradores ativos"
        value={data.employeeCount}
        icon={Users}
        accent="violet"
        href="/colaboradores?status=ACTIVE"
      />
      {data.canFerias && (
        <StatCard
          label="Férias pendentes"
          value={data.pendingFerias}
          icon={PalmtreeIcon}
          accent="amber"
          href="/ferias/aprovacoes"
        />
      )}
      {data.canAusencias && (
        <StatCard
          label="Ausências pendentes"
          value={data.pendingAusencias}
          icon={FileSignature}
          accent="sky"
          href="/ausencias"
        />
      )}
      {data.canContratos && (
        <StatCard
          label="Contratos a expirar (30d)"
          value={data.expiringContracts}
          icon={FileSignature}
          accent="rose"
          href="/contratos?horizon=30"
        />
      )}
      {data.canPicagens && (
        <StatCard
          label="Desvios de picagem por rever"
          value={data.openDeviations}
          icon={Fingerprint}
          accent="sky"
          href="/picagens/execucao"
        />
      )}
      {data.canAvaliacoes && (
        <StatCard
          label="Avaliações atrasadas"
          value={data.overdueEvaluations}
          icon={ClipboardCheck}
          accent="rose"
          href="/avaliacoes"
        />
      )}
    </div>
  );
}

function ManagementDashboardBody({
  data,
  currentEmployeeId,
}: {
  data: Awaited<ReturnType<typeof loadManagementDashboardData>>;
  currentEmployeeId: string | null;
}) {
  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
            <Building2 size={16} className="text-stone-500" />
            Colaboradores por departamento
          </h2>
          {data.deptBars.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Sem colaboradores no seu âmbito.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.deptBars.map((d) => (
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
                        style={{ width: `${Math.max(4, (d.count / data.maxDeptCount) * 100)}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {(data.canAusencias || data.canFerias) && (
          <AbsencesCard today={data.absentToday} upcoming={data.upcomingAbsences} />
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
            <Cake size={16} className="text-stone-500" />
            Aniversários deste mês
          </h2>
          {data.monthlyEntries.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Sem aniversários este mês no seu âmbito.</p>
          ) : (
            <MonthlyAnniversariesList
              entries={data.monthlyEntries}
              alreadyCommentedKeys={data.alreadyCommentedMonthlyKeys}
              currentEmployeeId={currentEmployeeId}
              monthName={data.monthName}
            />
          )}
        </Card>

        {data.canAcessos && (
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
              <Activity size={16} className="text-stone-500" />
              Atividade recente (auditoria)
            </h2>
            {data.recentAudit.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">Sem atividade registada.</p>
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {data.recentAudit.map((log) => {
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

async function loadColaboradorDashboardData(user: Awaited<ReturnType<typeof requireUser>>) {
  if (!user.employeeId) return null;

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

  return { nextShift, feriasDisponiveis, pendingAbsences, unjustifiedDeviations, upcomingAbsences };
}

function ColaboradorStatCards({ data }: { data: NonNullable<Awaited<ReturnType<typeof loadColaboradorDashboardData>>> }) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Próximo turno"
        value={
          data.nextShift
            ? `${data.nextShift.date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}`
            : "—"
        }
        hint={data.nextShift ? `${data.nextShift.startTime} - ${data.nextShift.endTime}` : "Sem turnos publicados"}
        icon={CalendarClock}
        accent="violet"
        href="/escalas"
      />
      <StatCard
        label="Dias de férias disponíveis"
        value={data.feriasDisponiveis !== null ? data.feriasDisponiveis.toFixed(1) : "—"}
        icon={PalmtreeIcon}
        accent="amber"
        href="/ferias"
      />
      <StatCard
        label="Os meus pedidos pendentes"
        value={data.pendingAbsences}
        icon={FileSignature}
        accent="sky"
        href="/ausencias"
      />
      <StatCard
        label="Picagens por justificar"
        value={data.unjustifiedDeviations}
        icon={AlertTriangle}
        accent="rose"
        href="/picagens"
      />
    </div>
  );
}

function ColaboradorDashboardBody({ data }: { data: NonNullable<Awaited<ReturnType<typeof loadColaboradorDashboardData>>> }) {
  return (
    <>
      <div className="mb-8">
        <AbsencesCard upcoming={data.upcomingAbsences} />
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
