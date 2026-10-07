"use client";

import { useActionState } from "react";
import { updateEmployeeBaseSalary, type UpdateBaseSalaryState } from "../actions";
import { SaveBanner } from "@/components/save-banner";

export function BaseSalaryForm({ employeeId, baseSalary }: { employeeId: string; baseSalary: number | null }) {
  const [state, formAction, pending] = useActionState<UpdateBaseSalaryState, FormData>(
    updateEmployeeBaseSalary.bind(null, employeeId),
    {}
  );

  return (
    <form action={formAction} className="flex items-end gap-2">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Vencimento base (€)</label>
        <input
          name="baseSalary"
          type="number"
          step="0.01"
          min={0}
          defaultValue={baseSalary ?? ""}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A guardar..." : "Guardar"}
      </button>
      {state.error && (
        <div className="basis-full">
          <SaveBanner status="error" message={state.error} />
        </div>
      )}
      {state.success && (
        <div className="basis-full">
          <SaveBanner status="success" message="Vencimento base atualizado." />
        </div>
      )}
    </form>
  );
}
