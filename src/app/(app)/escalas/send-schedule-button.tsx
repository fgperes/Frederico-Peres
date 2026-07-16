"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { sendScheduleNotification, type SendScheduleState } from "./actions";

const initialState: SendScheduleState = {};

export function SendScheduleButton({
  employeeIds,
  weekLabel,
}: {
  employeeIds: string[];
  weekLabel: string;
}) {
  const [state, formAction, pending] = useActionState(sendScheduleNotification, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      {employeeIds.map((id) => (
        <input key={id} type="hidden" name="employeeId" value={id} />
      ))}
      <input type="hidden" name="weekLabel" value={weekLabel} />
      <button
        type="submit"
        disabled={pending || employeeIds.length === 0}
        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        <Send size={15} />
        {pending ? "A enviar..." : "Enviar aos colaboradores"}
      </button>
      {state.error && <p className="text-sm text-rose-700">{state.error}</p>}
      {state.result && (
        <p className="text-sm text-emerald-700">
          {state.result.sent} colaborador(es) notificado(s)
          {state.result.skipped > 0 && `, ${state.result.skipped} sem conta de acesso`}.
        </p>
      )}
    </form>
  );
}
