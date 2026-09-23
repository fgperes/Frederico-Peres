"use client";

import { useActionState } from "react";
import { importIrsTableAction, type ImportIrsTableState } from "./actions";
import { FISCAL_REGIONS, FISCAL_REGION_LABELS } from "@/lib/payroll";

const initialState: ImportIrsTableState = {};

export function IrsTableImportForm() {
  const [state, formAction, pending] = useActionState(importIrsTableAction, initialState);
  const currentYear = new Date().getFullYear();

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Ano</label>
          <input
            name="year"
            type="number"
            required
            defaultValue={currentYear}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Região</label>
          <select name="region" defaultValue="CONTINENTE" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
            {FISCAL_REGIONS.map((r) => (
              <option key={r} value={r}>{FISCAL_REGION_LABELS[r]}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Descrição (opcional)</label>
        <input
          name="label"
          placeholder="ex.: Trabalho dependente — não casado, sem dependentes"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Ficheiro Excel (.xlsx)</label>
        <input name="file" type="file" accept=".xlsx,.xls" required className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        <p className="mt-1 text-xs text-stone-400">
          Colunas: Ordem, Até (€) (vazio no último escalão), Taxa (ex.: 0.13 = 13%).{" "}
          <a href="/api/templates/irs-tabela" className="text-violet-700 hover:underline">Descarregar modelo</a>
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A importar..." : "Anexar tabela"}
      </button>

      {state.error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}
      {state.success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Tabela criada com {state.imported} escalão(ões).
        </p>
      )}
    </form>
  );
}
