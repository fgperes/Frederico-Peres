"use client";

import { useActionState, useState, useTransition } from "react";
import {
  importPayrollComponentsAction,
  resolvePayrollComponentDuplicatesAction,
  type ImportPayrollComponentsState,
  type PayrollComponentDuplicate,
} from "../actions";
import { Modal } from "@/components/modal";
import { PAYROLL_COMPONENT_CATEGORY_LABELS } from "@/lib/payroll";

const initialState: ImportPayrollComponentsState = {};

export function ImportPayrollComponentsForm() {
  const [state, formAction, pending] = useActionState(importPayrollComponentsAction, initialState);
  const [duplicates, setDuplicates] = useState<PayrollComponentDuplicate[] | null>(null);
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});
  const [applyToAll, setApplyToAll] = useState(false);
  const [resolving, startResolving] = useTransition();
  const [resolvedCount, setResolvedCount] = useState<number | null>(null);

  // Assim que a ação devolve um novo resultado com duplicados, abre a modal
  // com uma linha por colaborador/rubrica em conflito (cada uma começa por
  // "manter o atual") — ajuste durante o render (mesmo padrão do
  // DateField/TimeField), para não reabrir ao fechar a modal.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.duplicates) {
      setDuplicates(state.duplicates);
      setDecisions(Object.fromEntries(state.duplicates.map((d) => [d.key, false])));
    }
  }

  function toggleAll(checked: boolean) {
    setApplyToAll(checked);
    if (!duplicates) return;
    setDecisions(Object.fromEntries(duplicates.map((d) => [d.key, checked])));
  }

  function toggleOne(key: string, checked: boolean) {
    setDecisions((prev) => ({ ...prev, [key]: checked }));
  }

  function confirmResolutions() {
    if (!duplicates) return;
    startResolving(async () => {
      const resolutions = duplicates.map((d) => ({
        existingComponentId: d.existingComponentId,
        replace: !!decisions[d.key],
        newAmount: d.newAmount,
        type: d.type,
        category: d.category,
      }));
      const result = await resolvePayrollComponentDuplicatesAction(resolutions);
      setResolvedCount(result.replaced);
      setDuplicates(null);
    });
  }

  return (
    <div className="space-y-3">
      <form action={formAction} className="space-y-3">
        {state.error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Ficheiro Excel (.xlsx)</label>
          <input
            name="file"
            type="file"
            accept=".xlsx,.xls"
            required
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-stone-400">
            Colunas: Nº Colaborador (ou Email), Rubrica, Tipo (Vencimento/Desconto), Categoria (Sujeito a IRS e SS /
            Sujeito só a IRS / Isento), Valor, Recorrente (Sim/Não), Ano e Mês (só se não recorrente).{" "}
            <a href="/api/templates/payroll-rubricas" className="text-violet-700 hover:underline">
              Descarregar modelo
            </a>
          </p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "A importar..." : "Importar rubricas"}
        </button>
        {state.created !== undefined && !state.duplicates && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {state.created} rubrica(s) criada(s).
          </p>
        )}
      </form>

      {resolvedCount !== null && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {resolvedCount} rubrica(s) substituída(s). As restantes mantiveram o valor atual.
        </p>
      )}

      <Modal
        open={!!duplicates && duplicates.length > 0}
        onClose={() => setDuplicates(null)}
        title="Rubricas já existentes"
        widthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            {state.created ? `${state.created} rubrica(s) nova(s) já foram criadas. ` : ""}
            Estas {duplicates?.length} já existem para o mesmo colaborador, rubrica e período — escolha quais
            substituir pelo valor novo.
          </p>

          <label className="flex items-center gap-2 border-b border-stone-200 pb-3 text-sm font-medium text-stone-700">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={(e) => toggleAll(e.target.checked)}
              className="rounded border-stone-300"
            />
            Aplicar a todos (substituir)
          </label>

          <div className="max-h-96 space-y-2 overflow-y-auto">
            {duplicates?.map((d) => (
              <label
                key={d.key}
                className="flex items-start gap-3 rounded-md border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50"
              >
                <input
                  type="checkbox"
                  checked={!!decisions[d.key]}
                  onChange={(e) => toggleOne(d.key, e.target.checked)}
                  className="mt-0.5 rounded border-stone-300"
                />
                <div>
                  <p className="font-medium text-stone-900">
                    {d.employeeName} — {d.name}
                  </p>
                  <p className="text-xs text-stone-500">
                    {PAYROLL_COMPONENT_CATEGORY_LABELS[d.category]} ·{" "}
                    {d.recurring ? "recorrente" : `${d.applyMonth}/${d.applyYear}`} · atual: {d.existingAmount.toFixed(2)} € →
                    novo: {d.newAmount.toFixed(2)} €
                  </p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-stone-200 pt-3">
            <button
              type="button"
              onClick={() => setDuplicates(null)}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
            >
              Ignorar duplicados
            </button>
            <button
              type="button"
              onClick={confirmResolutions}
              disabled={resolving}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {resolving ? "A aplicar..." : "Confirmar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
