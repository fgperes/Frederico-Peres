import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { TopBar } from "@/components/topbar/topbar";
import { getNotifications, getUnreadMessageCount } from "@/lib/notifications";
import { getAllowedRecipients } from "@/lib/messaging";
import { getOpenTasks } from "@/lib/tasks";
import { getTodayMealStatus } from "@/lib/meal-rules";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

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
    prisma.user.findUnique({ where: { id: user.id }, select: { avatarKey: true } }),
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
    <div className="flex min-h-screen flex-1">
      <Nav
        roles={user.roles}
        name={user.name ?? ""}
        email={user.email ?? ""}
        avatarKey={dbUser?.avatarKey ?? null}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
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
        />
        <main className="flex-1 overflow-y-auto bg-stone-100 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
