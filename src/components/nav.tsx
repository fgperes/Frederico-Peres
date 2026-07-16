"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { canRead, ROLE_LABELS, type Module, type Role } from "@/lib/roles";

const NAV_ITEMS: { href: string; label: string; module: Module }[] = [
  { href: "/dashboard", label: "Dashboard", module: "recursos" },
  { href: "/colaboradores", label: "Colaboradores", module: "recursos" },
  { href: "/estrutura", label: "Estrutura Organizacional", module: "recursos" },
  { href: "/horarios", label: "Horários", module: "horarios" },
  { href: "/picagens", label: "Picagens", module: "picagens" },
  { href: "/ausencias", label: "Ausências", module: "ausencias" },
  { href: "/contratos", label: "Contratos", module: "contratos" },
  { href: "/acessos", label: "Perfis e Acessos", module: "acessos" },
];

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
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-lg font-semibold text-slate-900">SGRH</p>
        <p className="text-xs text-slate-500">Gestão de Recursos Humanos</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{email}</p>
        <p className="mt-1 text-xs text-slate-400">
          {roles.map((r) => ROLE_LABELS[r]).join(", ")}
        </p>
        <Link
          href="/alterar-password"
          className="mt-3 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-center text-sm text-slate-700 hover:bg-slate-50"
        >
          Alterar password
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Terminar sessão
        </button>
      </div>
    </div>
  );
}
