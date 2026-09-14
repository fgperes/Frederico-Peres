"use client";

import { useActionState, useState } from "react";
import { addHoursCorrectionAction, type CorrectionState } from "./actions";
import { Pencil } from "lucide-react";

export function CorrectionForm({ employeeId, date }: { employeeId: string; date: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<CorrectionState, FormData>(
    async (_prev, formData) => {
      const result = await addHoursCorrectionAction(_prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    {}
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Corrigir horas"
        className="text-stone-400 hover:text-violet-600 dark:hover:text-violet-400"
      >
        <Pencil size={12} />
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-1 flex flex-col gap-1 rounded-md border border-stone-200 p-2 dark:border-stone-700">
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="date" value={date} />
      <div className="flex gap-1">
        <input
          name="minutesDelta"
          type="number"
          step="1"
          placeholder="±min"
          required
          className="w-20 rounded border border-stone-300 px-1.5 py-1 text-xs dark:border-stone-700 dark:bg-stone-800"
        />
        <input
          name="reason"
          placeholder="Motivo"
          required
          className="min-w-0 flex-1 rounded border border-stone-300 px-1.5 py-1 text-xs dark:border-stone-700 dark:bg-stone-800"
        />
      </div>
      {state.error && <p className="text-[11px] text-rose-600 dark:text-rose-400">{state.error}</p>}
      <div className="flex gap-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-violet-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-stone-300 px-2 py-0.5 text-[11px] dark:border-stone-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
