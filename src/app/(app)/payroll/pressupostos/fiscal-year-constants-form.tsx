"use client";

import { useActionState } from "react";
import { updateFiscalYearConstants, type FiscalYearConstantsFormState } from "../actions";
import { SaveBanner } from "@/components/save-banner";

type FiscalYearConstants = {
  year: number;
  ias: number;
  mealAllowanceExemptCardDaily: number;
  mealAllowanceExemptCashDaily: number;
  youngExemptionCapAnnualMultiplier: number;
  youngExemptionCapPaymentsPerYear: number;
};

function Field({
  label,
  name,
  defaultValue,
  step = "0.01",
  hint,
}: {
  label: string;
  name: string;
  defaultValue: number;
  step?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600">{label}</label>
      <input
        name={name}
        type="number"
        step={step}
        defaultValue={defaultValue}
        required
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
      />
      {hint && <p className="mt-0.5 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

export function FiscalYearConstantsForm({ constants }: { constants: FiscalYearConstants }) {
  const [state, formAction, pending] = useActionState<FiscalYearConstantsFormState, FormData>(
    updateFiscalYearConstants,
    {}
  );

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <SaveBanner status="error" message={state.error} />}
      <input type="hidden" name="year" value={constants.year} />
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Ano</label>
        <p className="text-sm text-stone-900">{constants.year}</p>
      </div>
      <Field label="IAS (€)" name="ias" defaultValue={constants.ias} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Limite isento — cartão refeição (€/dia)"
          name="mealAllowanceExemptCardDaily"
          defaultValue={constants.mealAllowanceExemptCardDaily}
        />
        <Field
          label="Limite isento — numerário/transferência (€/dia)"
          name="mealAllowanceExemptCashDaily"
          defaultValue={constants.mealAllowanceExemptCashDaily}
        />
      </div>
      <p className="text-xs text-stone-400">
        Acima destes valores por dia, o excesso do subsídio de alimentação passa a estar sujeito a IRS e Segurança Social.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Teto IRS Jovem — multiplicador × IAS"
          name="youngExemptionCapAnnualMultiplier"
          defaultValue={constants.youngExemptionCapAnnualMultiplier}
          step="1"
        />
        <Field
          label="Teto IRS Jovem — nº pagamentos/ano"
          name="youngExemptionCapPaymentsPerYear"
          defaultValue={constants.youngExemptionCapPaymentsPerYear}
          step="1"
          hint="12 meses + subsídios de férias e Natal"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A guardar..." : `Guardar constantes de ${constants.year}`}
      </button>
    </form>
  );
}
