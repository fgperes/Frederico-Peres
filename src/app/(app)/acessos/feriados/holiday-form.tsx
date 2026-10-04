"use client";

import { useActionState, useState } from "react";
import { createHoliday, type HolidayFormState } from "./actions";
import { DateField } from "@/components/date-field";

const initialState: HolidayFormState = {};

export function HolidayForm({ municipalitySuggestions }: { municipalitySuggestions: string[] }) {
  const [scope, setScope] = useState<"NATIONAL" | "REGIONAL">("NATIONAL");
  const [state, formAction, pending] = useActionState(createHoliday, initialState);

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
        <label className="mb-1 block text-xs font-medium text-stone-600">Data</label>
        <DateField
          name="date"
          required
          inputClassName="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Descrição</label>
        <input
          name="description"
          required
          placeholder="ex.: Dia Municipal"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Âmbito</label>
        <select
          name="scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as "NATIONAL" | "REGIONAL")}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="NATIONAL">Nacional</option>
          <option value="REGIONAL">Regional</option>
        </select>
      </div>
      {scope === "REGIONAL" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Concelhos onde é válido</label>
          <input
            name="municipalities"
            required
            placeholder="ex.: Lisboa, Cascais, Sintra"
            list="municipality-suggestions"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
          <datalist id="municipality-suggestions">
            {municipalitySuggestions.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-stone-500">
            Nomes de concelhos separados por vírgula. Aplica-se a qualquer colaborador cujo local de trabalho
            tenha um destes concelhos definido (Estrutura → Locais de Trabalho).
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
