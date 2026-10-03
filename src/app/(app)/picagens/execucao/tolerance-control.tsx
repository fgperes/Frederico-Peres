"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTimeClockToleranceAction } from "./actions";

// Margem de segurança do saldo de picagens — abaixo disto um dia não
// precisa de ação; acima, passa a mostrar o aviso de decisão na grelha.
export function ToleranceControl({ minutes }: { minutes: number }) {
  const [value, setValue] = useState(String(minutes));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    const n = Number(value);
    setError(null);
    startTransition(async () => {
      const result = await setTimeClockToleranceAction(n);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
      <span>Margem de segurança (min):</span>
      <input
        type="number"
        min={0}
        step={5}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (Number(value) !== minutes) save();
        }}
        disabled={pending}
        className="w-16 rounded-md border border-stone-300 px-2 py-1 text-center text-xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
      />
      {error && <span className="text-rose-600 dark:text-rose-400">{error}</span>}
    </div>
  );
}
