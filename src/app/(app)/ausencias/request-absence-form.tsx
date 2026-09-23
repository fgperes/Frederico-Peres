"use client";

import { useActionState } from "react";
import { requestAbsence, type RequestAbsenceState } from "./actions";
import { SaveBanner } from "@/components/save-banner";

export function RequestAbsenceForm({
  absenceTypes,
}: {
  absenceTypes: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<RequestAbsenceState, FormData>(
    requestAbsence,
    {}
  );

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <SaveBanner status="error" message={state.error} />}
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Tipo</label>
        <select
          name="absenceTypeId"
          required
          className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        >
          {absenceTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Início</label>
          <input
            name="startDate"
            type="date"
            required
            className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Fim</label>
          <input
            name="endDate"
            type="date"
            required
            className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Motivo</label>
        <input
          name="reason"
          className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
          Documento comprovativo (nome do ficheiro)
        </label>
        <input
          name="documentName"
          placeholder="atestado.pdf"
          className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A submeter..." : "Submeter pedido"}
      </button>
    </form>
  );
}
