"use client";

import { useActionState } from "react";
import { importEmployeesAction, type ImportState } from "../actions";

const initialState: ImportState = {};

export function ImportForm() {
  const [state, formAction, pending] = useActionState(
    importEmployeesAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Ficheiro Excel (.xlsx)
        </label>
        <input
          name="file"
          type="file"
          accept=".xlsx,.xls"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "A importar..." : "Importar"}
      </button>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {state.result && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">
            {state.result.created} de {state.result.total} colaboradores importados.
          </p>
          {state.result.errorReport.length > 0 && (
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-red-700">
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
