"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reverseHourPoolMovementAction } from "./actions";

export function ReverseMovementButton({ movementId }: { movementId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await reverseHourPoolMovementAction(movementId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-60 dark:text-rose-400"
      >
        Anular
      </button>
      {error && <span className="text-[11px] text-rose-600 dark:text-rose-400">{error}</span>}
    </div>
  );
}
