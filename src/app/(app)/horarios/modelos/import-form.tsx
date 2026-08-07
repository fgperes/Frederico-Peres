"use client";

import { useActionState } from "react";
import { importShiftTemplatesAction, type ImportTemplatesState } from "../actions";

const initialState: ImportTemplatesState = {};

export function ImportTemplatesForm() {
  const [state, formAction, pending] = useActionState(importShiftTemplatesAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">
          Ficheiro Excel (.xlsx)
        </label>
        <input
          name="file"
          type="file"
          accept=".xlsx,.xls"
          required
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A importar…" : "Importar"}
      </button>

      {state.error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}

      {state.result && (
        <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm">
          <p className="font-medium text-stone-800">
            {state.result.created} de {state.result.total} modelos de turno importados.
          </p>
          {state.result.errorReport.length > 0 && (
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-rose-700">
              {state.result.errorReport.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
