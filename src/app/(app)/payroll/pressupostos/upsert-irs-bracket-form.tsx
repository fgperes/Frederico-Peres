"use client";

import { useActionState } from "react";
import { upsertIrsBracket, type UpsertIrsBracketState } from "../actions";
import { SaveBanner } from "@/components/save-banner";

export function UpsertIrsBracketForm({ irsTableId, nextOrder }: { irsTableId: string; nextOrder: number }) {
  const [state, formAction, pending] = useActionState<UpsertIrsBracketState, FormData>(upsertIrsBracket, {});

  return (
    <form action={formAction} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
      {state.error && (
        <div className="col-span-4">
          <SaveBanner status="error" message={state.error} />
        </div>
      )}
      <input type="hidden" name="irsTableId" value={irsTableId} />
      <input
        name="order"
        type="number"
        placeholder="Ordem"
        required
        defaultValue={nextOrder}
        className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
      />
      <input
        name="upToGross"
        type="number"
        step="0.01"
        placeholder="Até € (vazio = último)"
        className="col-span-2 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
      />
      <input
        name="rate"
        type="number"
        step="0.001"
        placeholder="Taxa (0.13)"
        required
        className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="col-span-4 rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-60"
      >
        {pending ? "A guardar..." : "Adicionar / atualizar escalão"}
      </button>
    </form>
  );
}
