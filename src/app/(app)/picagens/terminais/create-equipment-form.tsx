"use client";

import { useActionState } from "react";
import { createEquipmentAction, type EquipmentFormState } from "./actions";
import { Button } from "@/components/ui";

const TYPES = [
  { value: "BIOMETRIC", label: "Terminal biométrico" },
  { value: "RFID", label: "Cartão / RFID" },
  { value: "PIN", label: "PIN" },
  { value: "MOBILE", label: "Aplicação móvel" },
  { value: "OTHER", label: "Outro" },
];

export function CreateEquipmentForm({ departments }: { departments: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<EquipmentFormState, FormData>(
    createEquipmentAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          Equipamento criado. O URL de integração está listado na tabela acima.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Nome</label>
          <input
            name="name"
            required
            placeholder="Ex.: Entrada Armazém"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Tipo</label>
          <select
            name="type"
            required
            defaultValue=""
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
          >
            <option value="" disabled>
              Selecione
            </option>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
            Localização / Departamento
          </label>
          <select
            name="departmentId"
            defaultValue=""
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
          >
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
            Endpoint da API do fabricante (opcional, apenas documentação)
          </label>
          <input
            name="apiEndpoint"
            placeholder="https://..."
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
          />
        </div>
      </div>

      <div className="rounded-md border border-stone-200 p-3 dark:border-stone-700">
        <p className="mb-2 text-xs font-medium text-stone-600 dark:text-stone-400">
          Mapeamento de campos do webhook — nomes exatos dos campos que este terminal envia no
          JSON. Só estes 3 são gravados; o resto do pedido é apenas informativo.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Campo do colaborador
            </label>
            <input
              name="payloadEmployeeField"
              defaultValue="employeeExternalId"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Campo do tipo de picagem
            </label>
            <input
              name="payloadTypeField"
              defaultValue="type"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Campo da data/hora
            </label>
            <input
              name="payloadTimestampField"
              defaultValue="timestamp"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
            />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "A criar..." : "Adicionar equipamento"}
      </Button>
    </form>
  );
}
