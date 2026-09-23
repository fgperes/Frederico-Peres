"use client";

import { useActionState } from "react";
import { createIrsTable, type CreateIrsTableState } from "../actions";
import { FISCAL_REGIONS, FISCAL_REGION_LABELS } from "@/lib/payroll";
import { SaveBanner } from "@/components/save-banner";

export function CreateIrsTableForm() {
  const [state, formAction, pending] = useActionState<CreateIrsTableState, FormData>(createIrsTable, {});

  return (
    <form action={formAction} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {state.error && (
        <div className="col-span-2">
          <SaveBanner status="error" message={state.error} />
        </div>
      )}
      <input
        name="year"
        type="number"
        placeholder="Ano"
        required
        defaultValue={new Date().getFullYear()}
        className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
      />
      <select name="region" defaultValue="CONTINENTE" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm">
        {FISCAL_REGIONS.map((r) => (
          <option key={r} value={r}>{FISCAL_REGION_LABELS[r]}</option>
        ))}
      </select>
      <input
        name="label"
        placeholder="Descrição (opcional)"
        className="col-span-2 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="col-span-2 rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-60"
      >
        {pending ? "A criar..." : "Criar tabela vazia"}
      </button>
    </form>
  );
}
