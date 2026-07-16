"use client";

import { useState } from "react";
import { Bell, ListTodo, MessageCircle, Clock } from "lucide-react";
import { DropdownButton } from "./dropdown-button";
import { NotificationsPanel } from "./notifications-panel";
import { TasksPanel } from "./tasks-panel";
import { MessagesPanel } from "./messages-panel";
import { ClockPanel } from "./clock-panel";
import type { NotificationItem } from "@/lib/notifications";
import type { Recipient } from "@/lib/messaging";

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
  hasEmployee,
}: {
  notifications: NotificationItem[];
  unreadMessageCount: number;
  messages: InboxMessage[];
  recipients: Recipient[];
  hasEmployee: boolean;
}) {
  const [open, setOpen] = useState<Panel>(null);

  function toggle(panel: Panel) {
    setOpen((curr) => (curr === panel ? null : panel));
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-1 border-b border-stone-200 bg-white px-6">
      {hasEmployee && (
        <DropdownButton
          icon={Clock}
          label="Picagem rápida"
          isOpen={open === "clock"}
          onToggle={() => toggle("clock")}
          onClose={() => setOpen(null)}
          panelClassName="w-72"
        >
          <ClockPanel onNavigate={() => setOpen(null)} />
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
        isOpen={open === "tasks"}
        onToggle={() => toggle("tasks")}
        onClose={() => setOpen(null)}
      >
        <TasksPanel />
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
    </header>
  );
}
