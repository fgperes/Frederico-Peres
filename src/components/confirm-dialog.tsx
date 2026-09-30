"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./ui";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
};

// Substitui o `window.confirm()` nativo (fora da identidade visual da app,
// sem suporte a dark mode) por um diálogo com o mesmo estilo do resto da
// aplicação. Uso: `const { confirm, dialog } = useConfirm(); if (!(await
// confirm("..."))) return; /* ... */ return <>{dialog}<button ... /></>;`
export function useConfirm() {
  const [state, setState] = useState<{ message: string; options: ConfirmOptions } | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    setState({ message, options });
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function resolve(value: boolean) {
    setState(null);
    resolverRef.current?.(value);
    resolverRef.current = null;
  }

  const dialog = state && (
    <Modal open onClose={() => resolve(false)} title={state.options.title ?? "Confirmar ação"} widthClassName="max-w-sm">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          <AlertTriangle size={16} strokeWidth={2} />
        </span>
        <p className="text-sm text-stone-600 dark:text-stone-300">{state.message}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={() => resolve(false)}>
          Cancelar
        </Button>
        <Button variant={state.options.variant ?? "danger"} type="button" onClick={() => resolve(true)} autoFocus>
          {state.options.confirmLabel ?? "Confirmar"}
        </Button>
      </div>
    </Modal>
  );

  return { confirm, dialog };
}
