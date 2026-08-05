"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutGrid,
  Users,
  Building2,
  CalendarClock,
  CalendarRange,
  Fingerprint,
  PalmtreeIcon,
  Plane,
  FileSignature,
  ShieldCheck,
  UserRound,
  LogOut,
  Banknote,
  BarChart3,
  X,
  type LucideIcon,
} from "lucide-react";
import { canRead, ROLE_LABELS, type Module, type Role } from "@/lib/roles";
import { AvatarImage } from "@/lib/avatars";
import { LogoMark, PeopleWordmark } from "@/components/brand/logo";
import { useMobileNav } from "@/components/mobile-nav-context";

const NAV_ITEMS: { href: string; label: string; module: Module; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", module: "recursos", icon: LayoutGrid },
  { href: "/colaboradores", label: "Colaboradores", module: "recursos", icon: Users },
  { href: "/estrutura", label: "Estrutura Organizacional", module: "recursos", icon: Building2 },
  { href: "/horarios", label: "Horários", module: "horarios", icon: CalendarClock },
  { href: "/escalas", label: "Escalas", module: "horarios", icon: CalendarRange },
  { href: "/picagens", label: "Picagens", module: "picagens", icon: Fingerprint },
  { href: "/ausencias", label: "Ausências", module: "ausencias", icon: PalmtreeIcon },
  { href: "/ferias", label: "Férias", module: "ferias", icon: Plane },
  { href: "/contratos", label: "Contratos", module: "contratos", icon: FileSignature },
  { href: "/payroll", label: "Payroll", module: "payroll", icon: Banknote },
  { href: "/relatorios", label: "Relatórios", module: "relatorios", icon: BarChart3 },
  { href: "/acessos", label: "Perfis e Acessos", module: "acessos", icon: ShieldCheck },
];

export function Nav({
  roles,
  name,
  email,
  avatarKey,
  avatarImage,
}: {
  roles: Role[];
  name: string;
  email: string;
  avatarKey: string | null;
  avatarImage: string | null;
}) {
  const pathname = usePathname();
  const { isOpen, close } = useMobileNav();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.href === "/dashboard") return true;
    return canRead(roles, item.module);
  });

  // Fecha a gaveta automaticamente ao navegar (ecrãs pequenos).
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] shrink-0 -translate-x-full flex-col border-r border-stone-200 bg-white transition-transform duration-200 ease-out dark:border-stone-800 dark:bg-stone-900 lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 ${
          isOpen ? "translate-x-0" : ""
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-600/30">
            <LogoMark className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <PeopleWordmark className="block truncate text-sm leading-tight text-stone-900 dark:text-stone-100" />
            <p className="truncate text-xs font-semibold uppercase tracking-wide leading-tight text-stone-400 dark:text-stone-500">
              SGRH
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar menu"
            className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800 lg:hidden"
          >
            <X size={18} />
          </button>
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
                prefetch={false}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                }`}
              >
                <Icon size={17} strokeWidth={2} className={active ? "text-violet-600 dark:text-violet-400" : "text-stone-500"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-stone-200 p-4 dark:border-stone-800">
          <div className="mb-3 flex items-center gap-2.5">
            <AvatarImage avatarKey={avatarKey} avatarImage={avatarImage} name={name} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">{name}</p>
              <p className="truncate text-xs text-stone-500 dark:text-stone-400">{email}</p>
            </div>
          </div>
          <p className="mb-3 truncate text-xs text-stone-500 dark:text-stone-400">
            {roles.map((r) => ROLE_LABELS[r]).join(", ")}
          </p>
          <div className="flex gap-2">
            <Link
              href="/perfil"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <UserRound size={14} />
              Perfil
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
