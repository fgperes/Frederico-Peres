"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Modal } from "@/components/modal";
import { createTrainingModality, updateTrainingModality, type TrainingModalityState } from "../actions";

const initialState: TrainingModalityState = {};

export type ModalityForEdit = { id: string; code: string; description: string; active: boolean };

// Mesmo padrão da modal de Tipos de Ausência (ver ausencias/tipos/absence-type-modal.tsx):
// o gatilho (`children`) é passado pelo Server Component que a usa.
export function TrainingModalityModal({
  modality,
  children,
}: {
  modality?: ModalityForEdit;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(modality);
  const action = isEdit ? updateTrainingModality.bind(null, modality!.id) : createTrainingModality;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [prevPending, setPrevPending] = useState(pending);
  if (pending !== prevPending) {
    setPrevPending(pending);
    if (!pending && prevPending && !state.error) setOpen(false);
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {children}
      </span>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? `Editar modalidade: ${modality!.code}` : "Nova modalidade"}
        widthClassName="max-w-sm"
      >
        <form action={formAction} className="space-y-3">
          {state.error && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
              {state.error}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Sigla</label>
            <input
              name="code"
              required
              placeholder="Ex.: PRES"
              defaultValue={modality?.code ?? ""}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Descrição</label>
            <input
              name="description"
              required
              placeholder="Ex.: Presencial"
              defaultValue={modality?.description ?? ""}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
            <input type="checkbox" name="active" defaultChecked={modality?.active ?? true} />
            Ativa
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {pending ? "A guardar..." : isEdit ? "Guardar alterações" : "Criar modalidade"}
          </button>
        </form>
      </Modal>
    </>
  );
}
