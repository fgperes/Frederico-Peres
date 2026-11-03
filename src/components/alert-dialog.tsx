"use client";

import { useCallback, useState } from "react";
import { AlertOctagon } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./ui";

// Popup bloqueante para erros que o utilizador tem de ver e corrigir antes
// de continuar (ex.: incumprimento legal ao gravar um turno) — diferente de
// useConfirm() (pede uma decisão sim/não antes de agir); este só informa e
// fecha. Uso: `const { showAlert, dialog } = useAlert(); showAlert(msg);
// /* ... */ return <>{dialog}...</>;`
export function useAlert() {
  const [state, setState] = useState<{ message: string; title?: string } | null>(null);

  const showAlert = useCallback((message: string, title?: string) => {
    setState({ message, title });
  }, []);

  const close = useCallback(() => setState(null), []);

  const dialog = state && (
    <Modal open onClose={close} title={state.title ?? "Não é possível guardar"} widthClassName="max-w-sm">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          <AlertOctagon size={16} strokeWidth={2} />
        </span>
        <p className="text-sm text-stone-600 dark:text-stone-300">{state.message}</p>
      </div>
      <div className="flex justify-end">
        <Button variant="primary" type="button" onClick={close} autoFocus>
          Corrigir
        </Button>
      </div>
    </Modal>
  );

  return { showAlert, dialog };
}
