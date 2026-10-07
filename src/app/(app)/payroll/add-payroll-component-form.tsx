"use client";

import { useActionState } from "react";
import { addPayrollComponent, type AddPayrollComponentState } from "./actions";
import { SaveBanner } from "@/components/save-banner";
import { PAYROLL_COMPONENT_CATEGORIES, PAYROLL_COMPONENT_CATEGORY_LABELS } from "@/lib/payroll";

export function AddPayrollComponentForm({
  employeeId,
  currentYear,
  currentMonth,
}: {
  employeeId: string;
  currentYear: number;
  currentMonth: number;
}) {
  const [state, formAction, pending] = useActionState<AddPayrollComponentState, FormData>(
    addPayrollComponent.bind(null, employeeId),
    {}
  );

  return (
    <form action={formAction} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {state.error && (
        <div className="col-span-2">
          <SaveBanner status="error" message={state.error} />
        </div>
      )}
      <input name="name" placeholder="Nome (ex.: Prémio)" required className="col-span-2 rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700" />
      <select name="type" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700">
        <option value="EARNING">Vencimento (+)</option>
        <option value="DEDUCTION">Desconto (−)</option>
      </select>
      <input name="amount" type="number" step="0.01" placeholder="Valor €" required className="rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700" />
      <label className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
        <input type="checkbox" name="recurring" defaultChecked /> Recorrente (todos os meses)
      </label>
      <select name="category" defaultValue="TAXABLE_SS" className="col-span-2 rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700">
        {PAYROLL_COMPONENT_CATEGORIES.map((c) => (
          <option key={c} value={c}>{PAYROLL_COMPONENT_CATEGORY_LABELS[c]}</option>
        ))}
      </select>
      <select name="applyMonth" defaultValue={currentMonth} className="rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <input name="applyYear" type="number" defaultValue={currentYear} placeholder="Ano (se pontual)" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700" />
      <button
        type="submit"
        disabled={pending}
        className="col-span-2 rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-60"
      >
        {pending ? "A adicionar..." : "Adicionar componente"}
      </button>
    </form>
  );
}
