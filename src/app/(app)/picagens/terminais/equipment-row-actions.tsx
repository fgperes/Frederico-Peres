"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteEquipment, toggleEquipmentActive } from "./actions";
import { useConfirm } from "@/components/confirm-dialog";

export function EquipmentRowActions({
  equipmentId,
  equipmentName,
  active,
}: {
  equipmentId: string;
  equipmentName: string;
  active: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await toggleEquipmentActive(equipmentId, !active);
      if (!result.ok) setError(result.error);
    });
  }

  async function handleDelete() {
    if (!(await confirm(`Eliminar o equipamento "${equipmentName}"?`))) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteEquipment(equipmentId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="relative flex items-center gap-2">
      {dialog}
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className="rounded-md border border-stone-300 px-2.5 py-1 text-xs hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:hover:bg-stone-800"
      >
        {active ? "Desativar" : "Ativar"}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        title="Eliminar"
        className="rounded-md p-1.5 text-stone-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60 dark:text-stone-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
      >
        <Trash2 size={15} />
      </button>
      {error && (
        <p className="absolute right-0 top-full z-10 mt-1 w-64 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow-md dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
