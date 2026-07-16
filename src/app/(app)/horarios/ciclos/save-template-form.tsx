"use client";

import { useState } from "react";
import { saveAsTemplate } from "./actions";
import { Button } from "@/components/ui";

export function SaveTemplateForm({ cycleId }: { cycleId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Guardar como modelo
      </Button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await saveAsTemplate(cycleId, formData);
        setOpen(false);
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
      <Button type="submit">Guardar</Button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-sm text-stone-500 hover:text-stone-700"
      >
        Cancelar
      </button>
    </form>
  );
}
