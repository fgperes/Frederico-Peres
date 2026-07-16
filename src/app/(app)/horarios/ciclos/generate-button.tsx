"use client";

import { useActionState } from "react";
import { generateCycleScheduleAction, type GenerateState } from "./actions";

const initialState: GenerateState = {};

export function GenerateButton({ cycleId }: { cycleId: string }) {
  const [state, formAction, pending] = useActionState(
    generateCycleScheduleAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="cycleId" value={cycleId} />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Horizonte (semanas)
        </label>
        <input
          name="horizonWeeks"
          type="number"
          defaultValue={4}
          min={1}
          max={26}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "A gerar..." : "Gerar escalas do ciclo"}
      </button>
      {state.result && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
          {state.result.created} turnos criados
          {state.result.skippedDueToAbsence > 0 &&
            `, ${state.result.skippedDueToAbsence} ignorados por ausência aprovada (HC-05)`}
          .
        </p>
      )}
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
