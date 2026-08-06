"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ALL_TABS = [
  { href: "/estrutura", label: "Visão Geral" },
  { href: "/estrutura/organograma", label: "Organograma" },
];

export function EstruturaTabs({ showGeral = true }: { showGeral?: boolean }) {
  const pathname = usePathname();
  const tabs = showGeral ? ALL_TABS : ALL_TABS.filter((tab) => tab.href !== "/estrutura");
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
