"use client";

import { useActionState } from "react";
import { createShiftTemplateAction, type CreateShiftTemplateState } from "../actions";

const initialState: CreateShiftTemplateState = {};

export function CreateTemplateForm() {
  const [state, formAction, pending] = useActionState(createShiftTemplateAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Nome</label>
        <input name="name" required placeholder="Manhã 08h-16h" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Início</label>
          <input name="startTime" type="time" required className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Fim</label>
          <input name="endTime" type="time" required className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Pausa (min)</label>
          <input name="breakMins" type="number" defaultValue={0} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Cor</label>
          <input name="color" type="color" defaultValue="#2563eb" className="h-9 w-full rounded-md border border-stone-300" />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A criar…" : "Criar modelo"}
      </button>
      {state.error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{state.error}</p>
      )}
    </form>
  );
}
