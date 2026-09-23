"use client";

import { useActionState } from "react";
import { assignEmployeeContract, type AssignContractFormState } from "./actions";
import { SaveBanner } from "@/components/save-banner";

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
        <label className="mb-1 block text-xs font-medium text-stone-600">Contrato</label>
        <select
          name="contractProfileId"
          required
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
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
          <label className="mb-1 block text-xs font-medium text-stone-600">Data de início</label>
          <input name="startDate" type="date" required className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Fim período experimental</label>
          <input name="trialPeriodEndDate" type="date" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Remuneração base (€)</label>
          <input name="baseSalary" type="number" step="0.01" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Documento contratual</label>
          <input name="documentName" placeholder="contrato_assinado.pdf" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Notas</label>
        <textarea name="notes" rows={2} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
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
