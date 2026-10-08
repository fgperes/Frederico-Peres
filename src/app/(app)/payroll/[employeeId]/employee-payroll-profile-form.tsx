"use client";

import { useActionState, useState } from "react";
import { updateEmployeePayrollProfile, type UpdateEmployeePayrollProfileState } from "../actions";
import { SaveBanner } from "@/components/save-banner";
import { DEFAULT_YOUNG_EXEMPTION_BY_YEAR_OF_BENEFIT } from "@/lib/payroll";

type Employee = {
  id: string;
  youngTaxRegime: boolean;
  youngTaxRegimeStartYear: number | null;
  adseBeneficiary: boolean;
  judicialDeductionPercent: number | null;
  vacationSubsidyMode: string | null;
  vacationSubsidyMonths: string | null;
  christmasSubsidyMode: string | null;
  christmasSubsidyMonths: string | null;
};

// Pré-visualização apenas — a tabela oficial usada no recibo pode ter sido
// personalizada em Payroll → Pressupostos para o ano em questão.
function previewExemptionLabel(startYear: number | null): string | null {
  if (!startYear) return null;
  const currentYear = new Date().getFullYear();
  const yearOfBenefit = currentYear - startYear + 1;
  if (yearOfBenefit < 1) return `Regime começa em ${startYear} — ainda não aplicável este ano.`;
  if (yearOfBenefit > 10) return `${yearOfBenefit}.º ano — regime já caducado (máximo de 10 anos).`;
  const percent = DEFAULT_YOUNG_EXEMPTION_BY_YEAR_OF_BENEFIT[yearOfBenefit] ?? 0.25;
  return `${yearOfBenefit}.º ano de isenção em ${currentYear} — ${Math.round(percent * 100)}% isento de IRS (até ao limite de 55× IAS/ano).`;
}

function SubsidyModeFields({
  prefix,
  label,
  defaultMode,
  defaultMonths,
}: {
  prefix: "vacation" | "christmas";
  label: string;
  defaultMode: string | null;
  defaultMonths: string | null;
}) {
  const [mode, setMode] = useState(defaultMode ?? "");
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">{label}</label>
      <select
        name={`${prefix}SubsidyMode`}
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700"
      >
        <option value="">Usar definição global</option>
        <option value="DUODECIMOS">Duodécimos mensais</option>
        <option value="MONTHS">Meses concretos</option>
      </select>
      {mode === "MONTHS" && (
        <input
          name={`${prefix}SubsidyMonths`}
          defaultValue={defaultMonths ?? ""}
          placeholder="ex.: 6 ou 5,11"
          className="mt-1.5 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700"
        />
      )}
    </div>
  );
}

export function EmployeePayrollProfileForm({ employee }: { employee: Employee }) {
  const [state, formAction, pending] = useActionState<UpdateEmployeePayrollProfileState, FormData>(
    updateEmployeePayrollProfile.bind(null, employee.id),
    {}
  );
  const [youngTaxRegime, setYoungTaxRegime] = useState(employee.youngTaxRegime);
  const [startYear, setStartYear] = useState<number | null>(employee.youngTaxRegimeStartYear);

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <SaveBanner status="error" message={state.error} />}
      {state.success && <SaveBanner status="success" message="Dados de payroll atualizados." />}

      <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
        <input
          type="checkbox"
          name="adseBeneficiary"
          defaultChecked={employee.adseBeneficiary}
          className="rounded border-stone-300 dark:border-stone-700"
        />
        Beneficiário ADSE
      </label>

      <div>
        <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
          <input
            type="checkbox"
            name="youngTaxRegime"
            checked={youngTaxRegime}
            onChange={(e) => setYoungTaxRegime(e.target.checked)}
            className="rounded border-stone-300 dark:border-stone-700"
          />
          Regime do IRS Jovem
        </label>
        {youngTaxRegime && (
          <div className="mt-1.5">
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Ano em que começou a receber rendimentos (1.º ano do regime)
            </label>
            <input
              name="youngTaxRegimeStartYear"
              type="number"
              min={2000}
              max={2100}
              value={startYear ?? ""}
              onChange={(e) => setStartYear(e.target.value ? Number(e.target.value) : null)}
              placeholder="ex.: 2024"
              className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700"
            />
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Este ano define o &quot;ano de rendimentos&quot; do regime, que determina a % de isenção: 1.º ano
              100%, 2.º–4.º 75%, 5.º–7.º 50%, 8.º–10.º 25% (máximo 10 anos, até aos 35 anos de idade).
              {previewExemptionLabel(startYear) && (
                <>
                  {" "}
                  <strong>{previewExemptionLabel(startYear)}</strong>
                </>
              )}
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Desconto judicial (%, opcional)</label>
        <input
          name="judicialDeductionPercent"
          type="number"
          step="0.01"
          min={0}
          max={100}
          defaultValue={employee.judicialDeductionPercent ?? ""}
          placeholder="Sem desconto judicial"
          className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700"
        />
      </div>

      <SubsidyModeFields
        prefix="vacation"
        label="Subsídio de férias"
        defaultMode={employee.vacationSubsidyMode}
        defaultMonths={employee.vacationSubsidyMonths}
      />
      <SubsidyModeFields
        prefix="christmas"
        label="Subsídio de Natal"
        defaultMode={employee.christmasSubsidyMode}
        defaultMonths={employee.christmasSubsidyMonths}
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A guardar..." : "Guardar"}
      </button>
    </form>
  );
}
