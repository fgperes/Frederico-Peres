"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui";

type Option = { id: string; name: string };

// Filtro por departamento e/ou local — mais simples que o filtro em
// árvore de Escalas (sem equipa/colaborador), já que o Execução agrega
// por hora, não por pessoa.
export function ExecucaoFilterPanel({
  departments,
  locations,
  initialDepartmentIds,
  initialLocationIds,
  week,
  day,
}: {
  departments: Option[];
  locations: Option[];
  initialDepartmentIds: string[];
  initialLocationIds: string[];
  week: string;
  day: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [departmentIds, setDepartmentIds] = useState<Set<string>>(new Set(initialDepartmentIds));
  const [locationIds, setLocationIds] = useState<Set<string>>(new Set(initialLocationIds));

  const activeCount = departmentIds.size + locationIds.size;

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  }

  function applyFilters() {
    const params = new URLSearchParams();
    params.set("week", week);
    params.set("day", day);
    for (const id of departmentIds) params.append("departmentId", id);
    for (const id of locationIds) params.append("locationId", id);
    router.push(`/escalas/execucao?${params.toString()}`);
    setOpen(false);
  }

  function clearFilters() {
    setDepartmentIds(new Set());
    setLocationIds(new Set());
  }

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
            <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  Departamentos
                </p>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-stone-200 p-1.5 dark:border-stone-700">
                  {departments.length === 0 ? (
                    <p className="px-1 py-1 text-xs text-stone-400">Sem departamentos.</p>
                  ) : (
                    departments.map((d) => (
                      <label key={d.id} className="flex items-center gap-1.5 px-1 py-0.5 text-xs text-stone-700 dark:text-stone-300">
                        <input
                          type="checkbox"
                          checked={departmentIds.has(d.id)}
                          onChange={() => toggle(departmentIds, setDepartmentIds, d.id)}
                          className="h-3.5 w-3.5 rounded border-stone-300"
                        />
                        {d.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  Locais
                </p>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-stone-200 p-1.5 dark:border-stone-700">
                  {locations.length === 0 ? (
                    <p className="px-1 py-1 text-xs text-stone-400">Sem locais.</p>
                  ) : (
                    locations.map((l) => (
                      <label key={l.id} className="flex items-center gap-1.5 px-1 py-0.5 text-xs text-stone-700 dark:text-stone-300">
                        <input
                          type="checkbox"
                          checked={locationIds.has(l.id)}
                          onChange={() => toggle(locationIds, setLocationIds, l.id)}
                          className="h-3.5 w-3.5 rounded border-stone-300"
                        />
                        {l.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
              <Button variant="secondary" type="button" onClick={clearFilters} className="flex-1">
                Limpar
              </Button>
              <Button type="button" onClick={applyFilters} className="flex-1">
                Filtrar
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
