"use client";

import { useState, useTransition } from "react";
import { saveAsTemplate } from "./actions";
import { Button } from "@/components/ui";

export function SaveTemplateForm({ cycleId }: { cycleId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Guardar como modelo
      </Button>
    );
  }

  return (
    <div>
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await saveAsTemplate(cycleId, formData);
            if (result.ok) {
              setOpen(false);
            } else {
              setError(result.error);
            }
          });
        }}
        className="flex items-center gap-2"
      >
        <input
          name="templateName"
          required
          autoFocus
          placeholder="Nome do modelo"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "A guardar…" : "Guardar"}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          Cancelar
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
