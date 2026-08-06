"use client";

import { useActionState } from "react";
import { createCycleAction, type CreateCycleState } from "./actions";

const initialState: CreateCycleState = {};

export function CreateCycleForm() {
  const [state, formAction, pending] = useActionState(createCycleAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Nome</label>
        <input name="name" required className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Duração (semanas)</label>
        <select name="weeks" defaultValue={2} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
          {[1, 2, 3, 4, 6, 8].map((w) => (
            <option key={w} value={w}>{w} semana{w > 1 ? "s" : ""}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-stone-500">
          Pode adicionar mais semanas depois, dentro do ciclo.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Data de início (semana 1)</label>
        <input name="startDate" type="date" required className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
      </div>
      <p className="text-xs text-stone-500">
        Depois de criado, entre no ciclo para associar os colaboradores.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A criar…" : "Criar ciclo"}
      </button>
      {state.error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
