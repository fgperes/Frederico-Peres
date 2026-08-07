"use client";

import { useState, useTransition } from "react";
import { createCycleFromTemplate } from "./actions";

export function UseTemplateForm({
  templateId,
  templateName,
}: {
  templateId: string;
  templateName: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-violet-700 hover:underline"
      >
        Usar este modelo
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createCycleFromTemplate(formData);
          if (result.ok) {
            setOpen(false);
          } else {
            setError(result.error);
          }
        });
      }}
      className="mt-2 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3"
    >
      <input type="hidden" name="templateId" value={templateId} />
      <input
        name="name"
        required
        defaultValue={templateName}
        placeholder="Nome do novo ciclo"
        className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
      />
      <input
        name="startDate"
        type="date"
        required
        className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "A criar…" : "Criar ciclo"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-white"
        >
          Cancelar
        </button>
      </div>
      {error && (
        <p className="rounded-md bg-rose-50 px-2 py-1.5 text-xs text-rose-700">{error}</p>
      )}
    </form>
  );
}
