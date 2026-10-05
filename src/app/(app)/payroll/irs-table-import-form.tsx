"use client";

import { useRef } from "react";
import { useActionState } from "react";
import { importIrsTableAction, type ImportIrsTableState } from "./actions";
import { FISCAL_REGIONS, FISCAL_REGION_LABELS, IRS_TABLE_TYPES, IRS_TABLE_TYPE_LABELS } from "@/lib/payroll";

const initialState: ImportIrsTableState = {};

export function IrsTableImportForm() {
  const [state, formAction, pending] = useActionState(importIrsTableAction, initialState);
  const currentYear = new Date().getFullYear();
  const formRef = useRef<HTMLFormElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Quando já existe uma tabela com escalões para o período escolhido, a
  // ação devolve `duplicate` em vez de gravar — reenviamos o mesmo
  // formulário com replace=1 só depois de confirmação.
  function confirmReplace() {
    if (!replaceInputRef.current || !formRef.current) return;
    replaceInputRef.current.value = "1";
    formRef.current.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input ref={replaceInputRef} type="hidden" name="replace" defaultValue="" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Ano</label>
          <input
            name="year"
            type="number"
            required
            defaultValue={currentYear}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Região</label>
          <select name="region" defaultValue="CONTINENTE" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
            {FISCAL_REGIONS.map((r) => (
              <option key={r} value={r}>{FISCAL_REGION_LABELS[r]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Tabela</label>
          <select name="tableType" defaultValue="I" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
            {IRS_TABLE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Descrição (opcional)</label>
        <input
          name="label"
          placeholder={IRS_TABLE_TYPE_LABELS.I}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Ficheiro Excel (.xlsx)</label>
        <input name="file" type="file" accept=".xlsx,.xls" required className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        <p className="mt-1 text-xs text-stone-400">
          Colunas: Ordem, Até (€) (vazio no último escalão), Taxa (ex.: 0.13 = 13%), Parcela a Abater (€),
          Coeficiente e Limiar (€) (só nos escalões com fórmula dinâmica), Adicional por Dependente (€).{" "}
          <a href="/api/templates/irs-tabela" className="text-violet-700 hover:underline">Descarregar modelo</a>
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A importar..." : "Anexar tabela"}
      </button>

      {state.error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}
      {state.duplicate && (
        <div className="space-y-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p>
            Já existe uma tabela de IRS {state.duplicate.tableType} para {state.duplicate.year} —{" "}
            {FISCAL_REGION_LABELS[state.duplicate.region] ?? state.duplicate.region}. Pretende substituir os
            escalões atuais pelos deste ficheiro?
          </p>
          <button
            type="button"
            onClick={confirmReplace}
            disabled={pending}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {pending ? "A substituir..." : "Substituir tabela"}
          </button>
        </div>
      )}
      {state.success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Tabela guardada com {state.imported} escalão(ões).
        </p>
      )}
    </form>
  );
}
