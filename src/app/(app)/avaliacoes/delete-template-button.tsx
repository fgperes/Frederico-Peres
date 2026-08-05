"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTemplate } from "./actions";

export function DeleteTemplateButton({ templateId, canDelete }: { templateId: string; canDelete: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!canDelete) return null;

  function handleClick() {
    if (!confirm("Eliminar este modelo de avaliação? Esta ação não pode ser desfeita.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteTemplate(templateId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocorreu um erro ao eliminar.");
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        title="Eliminar"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-stone-700 dark:hover:bg-rose-500/10"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
