"use client";

import { useActionState, useMemo, useState } from "react";
import { createHoliday, type HolidayFormState } from "./actions";
import { DateField } from "@/components/date-field";
import { DISTRICTS, ALL_MUNICIPALITIES, municipalitiesForDistrict } from "@/lib/pt-geo";

const initialState: HolidayFormState = {};

export function HolidayForm() {
  const [scope, setScope] = useState<"NATIONAL" | "REGIONAL">("NATIONAL");
  const [state, formAction, pending] = useActionState(createHoliday, initialState);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [filterDistrict, setFilterDistrict] = useState("");
  const [search, setSearch] = useState("");

  const options = useMemo(() => {
    const base = filterDistrict ? municipalitiesForDistrict(filterDistrict) : ALL_MUNICIPALITIES;
    const q = search.trim().toLowerCase();
    return q ? base.filter((m) => m.toLowerCase().includes(q)) : base;
  }, [filterDistrict, search]);

  function toggleMunicipality(m: string) {
    const next = new Set(selected);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    setSelected(next);
  }

  return (
    <form action={formAction} className="space-y-3">
      {state.success && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
          {state.success}
        </p>
      )}
      {state.error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
          {state.error}
        </p>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Data</label>
        <DateField
          name="date"
          required
          inputClassName="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Descrição</label>
        <input
          name="description"
          required
          placeholder="ex.: Dia Municipal"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Âmbito</label>
        <select
          name="scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as "NATIONAL" | "REGIONAL")}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700"
        >
          <option value="NATIONAL">Nacional</option>
          <option value="REGIONAL">Regional</option>
        </select>
      </div>
      {scope === "REGIONAL" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Concelhos onde é válido</label>
          <input type="hidden" name="municipalities" value={Array.from(selected).join(", ")} />
          {selected.size > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {Array.from(selected).map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => toggleMunicipality(m)}
                    className="text-violet-500 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300"
                    aria-label={`Remover ${m}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-left text-sm text-stone-600 dark:text-stone-400 dark:border-stone-700"
            >
              {selected.size === 0 ? "Selecionar concelhos..." : `${selected.size} concelho(s) selecionado(s)`}
            </button>
            {panelOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setPanelOpen(false)} />
                <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-md border border-stone-200 bg-white p-2 shadow-xl dark:border-stone-800 dark:bg-stone-800">
                  <div className="mb-2 flex gap-1.5">
                    <select
                      value={filterDistrict}
                      onChange={(e) => setFilterDistrict(e.target.value)}
                      className="w-1/2 rounded-md border border-stone-300 px-2 py-1 text-xs dark:border-stone-700"
                    >
                      <option value="">Todos os distritos</option>
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Pesquisar..."
                      className="w-1/2 rounded-md border border-stone-300 px-2 py-1 text-xs dark:border-stone-700"
                    />
                  </div>
                  <div className="max-h-48 space-y-0.5 overflow-y-auto">
                    {options.length === 0 ? (
                      <p className="px-1 py-1 text-xs text-stone-400 dark:text-stone-500">Sem resultados.</p>
                    ) : (
                      options.map((m) => (
                        <label
                          key={m}
                          className="flex items-center gap-1.5 rounded px-1 py-0.5 text-xs text-stone-700 hover:bg-stone-50 dark:text-stone-300"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(m)}
                            onChange={() => toggleMunicipality(m)}
                            className="h-3.5 w-3.5 rounded border-stone-300 dark:border-stone-700"
                          />
                          {m}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Aplica-se a qualquer colaborador cujo local de trabalho tenha um destes concelhos definido
            (Estrutura → Locais de Trabalho).
          </p>
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A criar..." : "Criar feriado"}
      </button>
    </form>
  );
}
