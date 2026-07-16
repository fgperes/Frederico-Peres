import Link from "next/link";
import { Bell } from "lucide-react";
import type { NotificationItem } from "@/lib/notifications";

export function NotificationsPanel({
  items,
  onNavigate,
}: {
  items: NotificationItem[];
  onNavigate: () => void;
}) {
  return (
    <div>
      <div className="border-b border-stone-200 px-4 py-3">
        <p className="text-sm font-semibold text-stone-900">Notificações</p>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <Bell size={20} className="text-stone-400" />
          <p className="text-xs text-stone-500">Sem notificações novas.</p>
        </div>
      ) : (
        <ul className="max-h-80 divide-y divide-stone-100 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className="block px-4 py-3 text-sm text-stone-700 hover:bg-stone-50"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
