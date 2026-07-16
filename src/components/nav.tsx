"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutGrid,
  Users,
  Building2,
  CalendarClock,
  Fingerprint,
  PalmtreeIcon,
  FileSignature,
  ShieldCheck,
  KeyRound,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { canRead, ROLE_LABELS, type Module, type Role } from "@/lib/roles";

const NAV_ITEMS: { href: string; label: string; module: Module; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", module: "recursos", icon: LayoutGrid },
  { href: "/colaboradores", label: "Colaboradores", module: "recursos", icon: Users },
  { href: "/estrutura", label: "Estrutura Organizacional", module: "recursos", icon: Building2 },
  { href: "/horarios", label: "Horários", module: "horarios", icon: CalendarClock },
  { href: "/picagens", label: "Picagens", module: "picagens", icon: Fingerprint },
  { href: "/ausencias", label: "Ausências", module: "ausencias", icon: PalmtreeIcon },
  { href: "/contratos", label: "Contratos", module: "contratos", icon: FileSignature },
  { href: "/acessos", label: "Perfis e Acessos", module: "acessos", icon: ShieldCheck },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Nav({
  roles,
  name,
  email,
}: {
  roles: Role[];
  name: string;
  email: string;
}) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.href === "/dashboard") return true;
    return canRead(roles, item.module);
  });

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-stone-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-stone-200 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-sm shadow-violet-600/30">
          S
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight text-stone-900">SGRH</p>
          <p className="text-xs leading-tight text-stone-500">Gestão de RH</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-violet-50 text-violet-700"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <Icon size={17} strokeWidth={2} className={active ? "text-violet-600" : "text-stone-500"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-stone-200 p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-900">{name}</p>
            <p className="truncate text-xs text-stone-500">{email}</p>
          </div>
        </div>
        <p className="mb-3 truncate text-xs text-stone-500">
          {roles.map((r) => ROLE_LABELS[r]).join(", ")}
        </p>
        <div className="flex gap-2">
          <Link
            href="/alterar-password"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            <KeyRound size={14} />
            Password
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
