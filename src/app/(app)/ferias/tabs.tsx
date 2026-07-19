"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FeriasTabs({ showTeamTabs }: { showTeamTabs: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/ferias", label: "O Meu Calendário" },
    ...(showTeamTabs
      ? [
          { href: "/ferias/equipa", label: "Equipa" },
          { href: "/ferias/aprovacoes", label: "Para Aprovação" },
        ]
      : []),
  ];

  if (tabs.length <= 1) return null;

  return (
    <div className="mb-6 flex gap-1 border-b border-stone-200 dark:border-stone-800">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium ${
              active
                ? "border-b-2 border-violet-600 text-violet-700 dark:text-violet-400"
                : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
