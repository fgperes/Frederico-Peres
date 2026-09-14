"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw } from "lucide-react";
import { setHoursCorrectionAction, deleteHoursCorrectionAction, type CorrectionState } from "./actions";

export function EditableHoursCell({
  employeeId,
  date,
  field,
  rawHours,
  correctedHours,
  hasCorrection,
}: {
  employeeId: string;
  date: string;
  field: "ACTUAL" | "SCHEDULED";
  rawHours: number;
  correctedHours: number;
  hasCorrection: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(correctedHours.toString());
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function save() {
    const newTotalHours = Number(value);
    if (!Number.isFinite(newTotalHours) || newTotalHours < 0) {
      setError("Valor inválido.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("employeeId", employeeId);
      formData.set("date", date);
      formData.set("field", field);
      formData.set("rawHours", rawHours.toString());
      formData.set("newTotalHours", newTotalHours.toString());
      formData.set("reason", reason);
      const result: CorrectionState = await setHoursCorrectionAction({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function revert() {
    startTransition(async () => {
      await deleteHoursCorrectionAction(employeeId, date, field);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-md border border-violet-300 bg-violet-50/50 p-1.5 dark:border-violet-700 dark:bg-violet-500/10">
        <input
          ref={inputRef}
          type="number"
          step="0.1"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-16 rounded border border-stone-300 px-1 py-0.5 text-center text-xs dark:border-stone-700 dark:bg-stone-800"
          autoFocus
        />
        <input
          type="text"
          placeholder="motivo (opcional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-24 rounded border border-stone-300 px-1 py-0.5 text-[11px] dark:border-stone-700 dark:bg-stone-800"
        />
        {error && <p className="text-[10px] text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded bg-violet-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {pending ? "..." : "OK"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded border border-stone-300 px-2 py-0.5 text-[11px] dark:border-stone-700"
          >
            X
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center justify-center gap-1">
      <span className={hasCorrection ? "font-medium text-violet-700 dark:text-violet-400" : ""}>
        {correctedHours.toFixed(1)}h
      </span>
      <button
        type="button"
        onClick={() => {
          setValue(correctedHours.toString());
          setEditing(true);
        }}
        title="Corrigir"
        className="text-stone-300 hover:text-violet-600 group-hover:text-stone-400 dark:hover:text-violet-400"
      >
        <Pencil size={11} />
      </button>
      {hasCorrection && (
        <button
          type="button"
          onClick={revert}
          disabled={pending}
          title="Repor valor original"
          className="text-stone-300 hover:text-rose-600 disabled:opacity-60 dark:hover:text-rose-400"
        >
          <RotateCcw size={11} />
        </button>
      )}
    </div>
  );
}
