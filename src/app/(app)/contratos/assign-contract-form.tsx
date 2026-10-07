"use client";

import { useActionState } from "react";
import { assignEmployeeContract, type AssignContractFormState } from "./actions";
import { SaveBanner } from "@/components/save-banner";
import { DateField } from "@/components/date-field";

export function AssignContractForm({
  employeeId,
  profiles,
}: {
  employeeId: string;
  profiles: { id: string; name: string; contractTypeLabel: string; weeklyHours: number }[];
}) {
  const [state, formAction, pending] = useActionState<AssignContractFormState, FormData>(
    assignEmployeeContract,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <SaveBanner status="error" message={state.error} />}
      <input type="hidden" name="employeeId" value={employeeId} />
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Contrato</label>
        <select
          name="contractProfileId"
          required
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        >
          <option value="">—</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.contractTypeLabel} — {p.weeklyHours}h
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Data de início</label>
          <DateField name="startDate" required inputClassName="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Fim período experimental</label>
          <DateField name="trialPeriodEndDate" inputClassName="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Notas</label>
        <textarea name="notes" rows={2} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A atribuir..." : "Atribuir contrato"}
      </button>
    </form>
  );
}
