"use client";

import { useTransition } from "react";
import { clockAction } from "./actions";

const BUTTONS: { type: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END"; label: string; color: string }[] = [
  { type: "CLOCK_IN", label: "Entrada", color: "bg-emerald-600 hover:bg-emerald-700" },
  { type: "BREAK_START", label: "Início Pausa", color: "bg-amber-500 hover:bg-amber-600" },
  { type: "BREAK_END", label: "Fim Pausa", color: "bg-amber-600 hover:bg-amber-700" },
  { type: "CLOCK_OUT", label: "Saída", color: "bg-rose-600 hover:bg-rose-700" },
];

export function ClockWidget() {
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {BUTTONS.map((b) => (
        <button
          key={b.type}
          disabled={pending}
          onClick={() => startTransition(() => clockAction(b.type))}
          className={`rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 ${b.color}`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
