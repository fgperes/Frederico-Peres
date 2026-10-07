"use client";

import { useActionState } from "react";
import { TimeField } from "@/components/time-field";
import { createShiftTemplateAction, type CreateShiftTemplateState } from "../actions";

const initialState: CreateShiftTemplateState = {};

export function CreateTemplateForm() {
  const [state, formAction, pending] = useActionState(createShiftTemplateAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Nome</label>
        <input name="name" required placeholder="Manhã 08h-16h" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Início</label>
          <TimeField name="startTime" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Fim</label>
          <TimeField name="endTime" required />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Pausa (min)</label>
          <input name="breakMins" type="number" defaultValue={0} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Hora de almoço</label>
          <TimeField name="breakStart" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Cor</label>
        <input name="color" type="color" defaultValue="#2563eb" className="h-9 w-full rounded-md border border-stone-300 dark:border-stone-700" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A criar…" : "Criar modelo"}
      </button>
      {state.error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">{state.error}</p>
      )}
    </form>
  );
}
