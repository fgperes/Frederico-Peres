"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw } from "lucide-react";
import { setActualTimesCorrectionAction, deleteHoursCorrectionAction, type CorrectionState } from "./actions";

// Corrige o horário real de um dia (entrada/saída) — nunca um número de
// horas. Disponível para quem gere Picagens e para o próprio colaborador
// no seu próprio dia; fica sempre registada como alteração manual
// (visível a quem vê a grelha, com motivo opcional e autor em auditoria).
export function EditActualTimesCell({
  employeeId,
  date,
  rawHours,
  currentStart,
  currentEnd,
  hasCorrection,
}: {
  employeeId: string;
  date: string;
  rawHours: number;
  currentStart: string | null;
  currentEnd: string | null;
  hasCorrection: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(currentStart ?? "");
  const [end, setEnd] = useState(currentEnd ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    if (!start || !end) {
      setError("Indique a hora de início e de fim.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("employeeId", employeeId);
      formData.set("date", date);
      formData.set("rawHours", rawHours.toString());
      formData.set("startTime", start);
      formData.set("endTime", end);
      formData.set("reason", reason);
      const result: CorrectionState = await setActualTimesCorrectionAction({}, formData);
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
      await deleteHoursCorrectionAction(employeeId, date);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-md border border-violet-300 bg-violet-50/50 p-1.5 dark:border-violet-700 dark:bg-violet-500/10">
        <div className="flex items-center gap-1">
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-[5.5rem] rounded border border-stone-300 px-1 py-0.5 text-center text-xs dark:border-stone-700 dark:bg-stone-800"
            autoFocus
          />
          <span className="text-xs text-stone-400">→</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-[5.5rem] rounded border border-stone-300 px-1 py-0.5 text-center text-xs dark:border-stone-700 dark:bg-stone-800"
          />
        </div>
        <input
          type="text"
          placeholder="motivo (opcional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-36 rounded border border-stone-300 px-1 py-0.5 text-[11px] dark:border-stone-700 dark:bg-stone-800"
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
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => {
          setStart(currentStart ?? "");
          setEnd(currentEnd ?? "");
          setEditing(true);
        }}
        title="Corrigir horário"
        className="text-stone-300 hover:text-violet-600 dark:hover:text-violet-400"
      >
        <Pencil size={11} />
      </button>
      {hasCorrection && (
        <button
          type="button"
          onClick={revert}
          disabled={pending}
          title="Repor horário original"
          className="text-stone-300 hover:text-rose-600 disabled:opacity-60 dark:hover:text-rose-400"
        >
          <RotateCcw size={11} />
        </button>
      )}
    </div>
  );
}
