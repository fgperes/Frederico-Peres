"use client";

import { useActionState } from "react";
import { updatePayrollSettings, type PayrollSettingsFormState } from "../actions";
import { SaveBanner } from "@/components/save-banner";
import type { PayrollSettings } from "@prisma/client";

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

export function PayrollSettingsForm({ settings }: { settings: PayrollSettings }) {
  const [state, formAction, pending] = useActionState<PayrollSettingsFormState, FormData>(
    updatePayrollSettings,
    {}
  );

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <SaveBanner status="error" message={state.error} />}
      <Field label="Salário mínimo nacional (€/mês)" name="minimumWage" defaultValue={settings.minimumWage} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Taxa SS trabalhador"
          name="socialSecurityEmployeeRate"
          defaultValue={settings.socialSecurityEmployeeRate}
          step="0.001"
          hint="ex.: 0.11 = 11%"
        />
        <Field
          label="Taxa SS entidade patronal"
          name="socialSecurityEmployerRate"
          defaultValue={settings.socialSecurityEmployerRate}
          step="0.001"
          hint="ex.: 0.2375 = 23,75%"
        />
      </div>
      <Field
        label="Taxa seguro de acidentes de trabalho"
        name="workAccidentInsuranceRate"
        defaultValue={settings.workAccidentInsuranceRate}
        step="0.001"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Subsídio de alimentação (€/dia)" name="mealAllowanceDaily" defaultValue={settings.mealAllowanceDaily} />
        <Field
          label="Limite isento (€/dia)"
          name="mealAllowanceExemptCap"
          defaultValue={settings.mealAllowanceExemptCap}
          hint="acima disto é tributado"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field
          label="Acréscimo 1ª hora extra"
          name="overtimeRateFirstHour"
          defaultValue={settings.overtimeRateFirstHour}
          step="0.01"
        />
        <Field
          label="Acréscimo horas extra seguintes"
          name="overtimeRateAdditional"
          defaultValue={settings.overtimeRateAdditional}
          step="0.01"
        />
        <Field
          label="Acréscimo fim de semana/feriado"
          name="overtimeRateWeekendHoliday"
          defaultValue={settings.overtimeRateWeekendHoliday}
          step="0.01"
        />
      </div>
      <Field label="Dias úteis por mês (p/ desconto de faltas)" name="workingDaysPerMonth" defaultValue={settings.workingDaysPerMonth} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Subsídio de férias</label>
          <select
            name="vacationSubsidyMode"
            defaultValue={settings.vacationSubsidyMode}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="LUMP_SUM_JUNE">Pagamento único em junho</option>
            <option value="MONTHLY_DUODECIMOS">Duodécimos mensais</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Subsídio de Natal</label>
          <select
            name="christmasSubsidyMode"
            defaultValue={settings.christmasSubsidyMode}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="LUMP_SUM_DECEMBER">Pagamento único em dezembro</option>
            <option value="MONTHLY_DUODECIMOS">Duodécimos mensais</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A guardar..." : "Guardar pressupostos"}
      </button>
    </form>
  );
}
