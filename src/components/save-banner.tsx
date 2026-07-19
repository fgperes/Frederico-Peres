"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

export type SaveStatus = "idle" | "success" | "error";

const DEFAULT_SUCCESS = "Alteração guardada com sucesso.";
const DEFAULT_ERROR = "Ocorreu um erro ao gravar. Tente novamente.";

// Hook + componente partilhados para dar sempre feedback (verde/sucesso,
// vermelho/erro com o motivo) sempre que uma alteração é gravada no sistema.
export function useSaveFeedback() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");

  const run = useCallback(
    async (action: () => Promise<void>, successMessage: string = DEFAULT_SUCCESS) => {
      setStatus("idle");
      try {
        await action();
        setStatus("success");
        setMessage(successMessage);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : DEFAULT_ERROR);
      }
    },
    []
  );

  const reset = useCallback(() => setStatus("idle"), []);

  return { status, message, run, reset };
}

export function SaveBanner({ status, message }: { status: SaveStatus; message?: string }) {
  if (status === "idle") return null;

  if (status === "success") {
    return (
      <div className="mb-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        <span>{message || DEFAULT_SUCCESS}</span>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message || DEFAULT_ERROR}</span>
    </div>
  );
}
