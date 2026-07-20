"use client";

import { useState } from "react";
import { Bell, ListTodo, MessageCircle, Clock, Menu } from "lucide-react";
import { DropdownButton } from "./dropdown-button";
import { NotificationsPanel } from "./notifications-panel";
import { TasksPanel } from "./tasks-panel";
import { MessagesPanel } from "./messages-panel";
import { ClockPanel } from "./clock-panel";
import { ViewAsSwitcher } from "./view-as-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { TalenzaMark } from "@/components/brand/logo";
import { useMobileNav } from "@/components/mobile-nav-context";
import type { NotificationItem } from "@/lib/notifications";
import type { Recipient } from "@/lib/messaging";
import type { Role } from "@/lib/roles";
import type { TaskItem } from "@/lib/tasks";
import type { MealStatus } from "@/lib/meal-rules";

type InboxMessage = {
  id: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  sender: { name: string };
};

type Panel = "notifications" | "tasks" | "messages" | "clock" | null;

export function TopBar({
  notifications,
  unreadMessageCount,
  messages,
  recipients,
  tasks,
  hasEmployee,
  mealStatus,
  canPreviewRoles,
  currentViewAs,
  currentViewAsLabel,
  previewableRoles,
}: {
  notifications: NotificationItem[];
  unreadMessageCount: number;
  messages: InboxMessage[];
  recipients: Recipient[];
  tasks: TaskItem[];
  hasEmployee: boolean;
  mealStatus: MealStatus | null;
  canPreviewRoles: boolean;
  currentViewAs: Role | null;
  currentViewAsLabel: string | null;
  previewableRoles: { key: Role; label: string }[];
}) {
  const [open, setOpen] = useState<Panel>(null);
  const { toggle: toggleMobileNav } = useMobileNav();

  function toggle(panel: Panel) {
    setOpen((curr) => (curr === panel ? null : panel));
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-3 sm:px-6 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={toggleMobileNav}
          aria-label="Abrir menu"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 lg:hidden"
        >
          <Menu size={19} />
        </button>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 text-white lg:hidden">
          <TalenzaMark className="h-4 w-4" />
        </span>
        {canPreviewRoles && (
          <div className="hidden sm:block">
            <ViewAsSwitcher
              currentViewAs={currentViewAs}
              currentViewAsLabel={currentViewAsLabel}
              previewableRoles={previewableRoles}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />

        {hasEmployee && mealStatus && (
          <DropdownButton
            icon={Clock}
            label="Picagem rápida"
            isOpen={open === "clock"}
            onToggle={() => toggle("clock")}
            onClose={() => setOpen(null)}
            panelClassName="w-72"
          >
            <ClockPanel onNavigate={() => setOpen(null)} status={mealStatus} />
          </DropdownButton>
        )}

        <DropdownButton
          icon={MessageCircle}
          label="Mensagens rápidas"
          badgeCount={unreadMessageCount}
          isOpen={open === "messages"}
          onToggle={() => toggle("messages")}
          onClose={() => setOpen(null)}
          panelClassName="w-96"
        >
          <MessagesPanel recipients={recipients} messages={messages} />
        </DropdownButton>

        <DropdownButton
          icon={ListTodo}
          label="Tarefas"
          badgeCount={tasks.length}
          isOpen={open === "tasks"}
          onToggle={() => toggle("tasks")}
          onClose={() => setOpen(null)}
        >
          <TasksPanel tasks={tasks} />
        </DropdownButton>

        <DropdownButton
          icon={Bell}
          label="Notificações"
          badgeCount={notifications.reduce((sum, n) => sum + n.count, 0)}
          isOpen={open === "notifications"}
          onToggle={() => toggle("notifications")}
          onClose={() => setOpen(null)}
        >
          <NotificationsPanel items={notifications} onNavigate={() => setOpen(null)} />
        </DropdownButton>
      </div>
    </header>
  );
}
