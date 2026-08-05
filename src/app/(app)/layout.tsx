import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLES, ROLE_LABELS } from "@/lib/roles";
import { Nav } from "@/components/nav";
import { TopBar } from "@/components/topbar/topbar";
import { getNotifications, getUnreadMessageCount } from "@/lib/notifications";
import { getAllowedRecipients } from "@/lib/messaging";
import { getOpenTasks } from "@/lib/tasks";
import { getTodayMealStatus } from "@/lib/meal-rules";
import { ensureEvaluationDueTasks } from "@/lib/evaluations";
import { MobileNavProvider } from "@/components/mobile-nav-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Sem cron disponível: cria (se ainda não existirem) as tarefas de aviso
  // de avaliações agendadas para os próximos 30 dias a cada carregamento de
  // página, antes de ler as tarefas abertas do utilizador abaixo.
  await ensureEvaluationDueTasks();

  const [notifications, unreadMessageCount, recipients, messages, dbUser, tasks] = await Promise.all([
    getNotifications(user),
    getUnreadMessageCount(user.id),
    getAllowedRecipients(user),
    prisma.message.findMany({
      where: { recipientId: user.id },
      include: { sender: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { avatarKey: true, avatarImage: true } }),
    getOpenTasks(user.id),
  ]);

  let mealStatus = null;
  if (user.employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      select: { weeklyHours: true },
    });
    mealStatus = await getTodayMealStatus(user.employeeId, employee?.weeklyHours ?? 40);
  }

  return (
    <MobileNavProvider>
      <div className="flex min-h-screen flex-1">
        <Nav
          roles={user.roles}
          name={user.name ?? ""}
          email={user.email ?? ""}
          avatarKey={dbUser?.avatarKey ?? null}
          avatarImage={dbUser?.avatarImage ?? null}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar
            notifications={notifications}
            unreadMessageCount={unreadMessageCount}
            recipients={recipients}
            messages={messages}
            tasks={tasks}
            hasEmployee={!!user.employeeId}
            mealStatus={mealStatus}
            canPreviewRoles={user.realRoles.includes("ADMIN_SISTEMA")}
            currentViewAs={user.isViewingAs ? user.roles[0] : null}
            currentViewAsLabel={user.isViewingAs ? (ROLE_LABELS[user.roles[0]] ?? user.roles[0]) : null}
            previewableRoles={ROLES.filter((r) => r !== "ADMIN_SISTEMA").map((key) => ({
              key,
              label: ROLE_LABELS[key],
            }))}
          />
          <main className="flex-1 overflow-y-auto bg-stone-100 p-4 sm:p-6 lg:p-8 dark:bg-stone-950">
            {children}
          </main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
