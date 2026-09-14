"use client";

import { useState, useTransition } from "react";
import { setPredictiveModuleEnabled } from "./actions";

export function SubscriptionToggle({ enabled }: { enabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setPredictiveModuleEnabled(checked);
      if (!result.ok) setError(result.error ?? "Erro ao atualizar.");
    });
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-dashed border-stone-300 px-4 py-3 text-xs dark:border-stone-700">
      <div>
        <p className="font-medium text-stone-700 dark:text-stone-300">Módulo preditivo subscrito</p>
        <p className="text-stone-500">Visível só para Administrador do Sistema.</p>
        {error && <p className="mt-1 text-rose-600">{error}</p>}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(e) => handleToggle(e.currentTarget.checked)}
          className="h-4 w-4 accent-violet-600"
        />
        {enabled ? "Ativo" : "Inativo"}
      </label>
    </div>
  );
}
