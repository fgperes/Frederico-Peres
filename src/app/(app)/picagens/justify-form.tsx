"use client";

import { submitJustification } from "./actions";

export function JustifyForm({ entryId }: { entryId: string }) {
  return (
    <form action={submitJustification.bind(null, entryId)} className="mt-2 flex gap-2">
      <input
        name="justification"
        placeholder="Justificação..."
        required
        className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
      />
      <button type="submit" className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-900">
        Submeter
      </button>
    </form>
  );
}
