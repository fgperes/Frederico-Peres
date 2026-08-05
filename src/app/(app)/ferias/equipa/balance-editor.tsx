"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { updateVacationBalance } from "../actions";
import { SaveBanner, useSaveFeedback } from "@/components/save-banner";

export function BalanceEditor({
  employeeId,
  year,
  totalDays,
}: {
  employeeId: string;
  year: number;
  totalDays: number;
}) {
  const [editing, setEditing] = useState(false);
  const [total, setTotal] = useState(String(totalDays));
  const [pending, startTransition] = useTransition();
  const { status, message, run } = useSaveFeedback();
  const router = useRouter();

  function save() {
    startTransition(() => {
      run(async () => {
        const formData = new FormData();
        formData.set("totalDays", total);
        await updateVacationBalance(employeeId, year, formData);
        router.refresh();
        setEditing(false);
      }, "Total atualizado com sucesso.");
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 rounded-md border border-stone-300 px-2 py-1 text-xs hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
      >
        <Pencil size={11} />
        Editar
      </button>
    );
  }

  return (
    <div className="inline-block">
      <SaveBanner status={status} message={message} />
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          title="Total de dias de férias do ano"
          className="w-16 rounded-md border border-stone-300 px-1.5 py-1 text-xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded-md p-1 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md p-1 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
