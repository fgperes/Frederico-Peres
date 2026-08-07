"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCycle } from "./actions";

export function DeleteCycleButton({ cycleId, cycleName }: { cycleId: string; cycleName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`Apagar "${cycleName}"? Esta ação não pode ser desfeita.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCycle(cycleId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/horarios/ciclos");
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        title="Apagar ciclo"
        className="rounded-md p-2 text-stone-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
      >
        <Trash2 size={16} />
      </button>
      {error && (
        <p className="absolute right-0 top-full z-10 mt-1 w-64 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow-md dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
