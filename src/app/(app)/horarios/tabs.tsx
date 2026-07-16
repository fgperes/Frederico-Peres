"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/horarios", label: "Horário Manual" },
  { href: "/horarios/ciclos", label: "Horário em Ciclo" },
  { href: "/horarios/preditivo", label: "Horário Preditivo" },
  { href: "/horarios/modelos", label: "Modelos de Turno" },
];

export function HorariosTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 border-b border-stone-200">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium ${
              active
                ? "border-b-2 border-violet-600 text-violet-700"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
