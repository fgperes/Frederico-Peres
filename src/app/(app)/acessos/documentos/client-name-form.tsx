"use client";

import { useState, useTransition } from "react";
import { updateClientCompanyName } from "./actions";
import { Button } from "@/components/ui";
import { Check } from "lucide-react";

export function ClientNameForm({ currentName }: { currentName: string | null }) {
  const [name, setName] = useState(currentName ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateClientCompanyName(name);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
        Nome da empresa cliente
      </label>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Empresa Cliente, Lda."
          className="w-full max-w-xs rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
        />
        <Button onClick={handleSave} disabled={pending} variant="secondary">
          {pending ? "A guardar..." : saved ? <Check size={14} /> : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
