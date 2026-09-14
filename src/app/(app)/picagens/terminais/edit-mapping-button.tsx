"use client";

import { useActionState, useState } from "react";
import { Settings2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";
import { updatePayloadMappingAction, type EquipmentFormState } from "./actions";

export function EditMappingButton({
  equipmentId,
  equipmentName,
  payloadEmployeeField,
  payloadTypeField,
  payloadTimestampField,
}: {
  equipmentId: string;
  equipmentName: string;
  payloadEmployeeField: string;
  payloadTypeField: string;
  payloadTimestampField: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<EquipmentFormState, FormData>(
    async (_prev, formData) => {
      const result = await updatePayloadMappingAction(_prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    {}
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Editar mapeamento de campos"
        className="text-stone-400 hover:text-violet-600 dark:hover:text-violet-400"
      >
        <Settings2 size={15} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Mapeamento de campos — ${equipmentName}`}>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="equipmentId" value={equipmentId} />
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Nomes exatos dos campos que este terminal envia no JSON do webhook. Só estes 3 são
            gravados; o resto do pedido fica apenas como referência.
          </p>
          {state.error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
              {state.error}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Campo do colaborador
            </label>
            <input
              name="payloadEmployeeField"
              defaultValue={payloadEmployeeField}
              required
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Campo do tipo de picagem
            </label>
            <input
              name="payloadTypeField"
              defaultValue={payloadTypeField}
              required
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Campo da data/hora
            </label>
            <input
              name="payloadTimestampField"
              defaultValue={payloadTimestampField}
              required
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "A guardar..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
