"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateAbsenceTypeCode } from "../actions";

export function SsCodeCell({ absenceTypeId, code }: { absenceTypeId: string; code: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(code ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    startTransition(async () => {
      await updateAbsenceTypeCode(absenceTypeId, value);
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ex.: F01"
          className="w-20 rounded border border-stone-300 px-1.5 py-0.5 text-xs dark:border-stone-700 dark:bg-stone-800"
          autoFocus
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded bg-violet-600 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "..." : "OK"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1 text-stone-700 hover:text-violet-700 dark:text-stone-300 dark:hover:text-violet-400"
    >
      {code ?? <span className="italic text-stone-400">definir</span>}
      <Pencil size={11} className="opacity-0 group-hover:opacity-100" />
    </button>
  );
}
