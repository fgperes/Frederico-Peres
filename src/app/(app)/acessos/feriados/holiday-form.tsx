"use client";

import { useState } from "react";
import { createHoliday } from "./actions";

export function HolidayForm({ locations }: { locations: { id: string; name: string }[] }) {
  const [scope, setScope] = useState<"NATIONAL" | "REGIONAL">("NATIONAL");

  return (
    <form action={createHoliday} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Data</label>
        <input
          name="date"
          type="date"
          required
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
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
          <label className="mb-1 block text-xs font-medium text-stone-600">
            Locais de trabalho onde é válido
          </label>
          {locations.length === 0 ? (
            <p className="text-xs text-stone-500">Sem locais de trabalho configurados.</p>
          ) : (
            <select
              name="locationIds"
              multiple
              required
              className="h-28 w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <button
        type="submit"
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
      >
        Criar feriado
      </button>
    </form>
  );
}
