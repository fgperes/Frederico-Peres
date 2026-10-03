"use client";

import { useState, type ReactNode } from "react";
import { Filter } from "lucide-react";

// Agrupa os filtros (departamento/equipa/colaborador) atrás de um único
// botão "Filtro" com contador de filtros ativos, em vez de 3 campos sempre
// visíveis — mesma submissão GET de sempre, só a apresentação muda.
export function FilterPopover({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        <Filter size={14} className="text-stone-400" />
        Filtro
        {activeCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-stone-200 bg-white p-3 shadow-xl dark:border-stone-700 dark:bg-stone-900">
            {children}
          </div>
        </>
      )}
    </div>
  );
}
