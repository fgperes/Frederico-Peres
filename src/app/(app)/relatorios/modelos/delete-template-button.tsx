"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/confirm-dialog";
import { deleteDocumentTemplate } from "./actions";

export function DeleteTemplateButton({ templateId, templateName }: { templateId: string; templateName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const router = useRouter();

  async function handleDelete() {
    if (!(await confirm(`Eliminar o modelo "${templateName}"? Esta ação não pode ser desfeita.`))) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteDocumentTemplate(templateId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível eliminar o modelo.");
      }
    });
  }

  return (
    <>
      {dialog}
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        title="Eliminar modelo"
        className="text-stone-400 hover:text-rose-600 disabled:opacity-60 dark:hover:text-rose-400 dark:text-stone-500"
      >
        <Trash2 size={14} />
      </button>
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </>
  );
}
