"use client";

import { useState } from "react";
import { updateEmployeePayrollProfile } from "../actions";

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
      <label className="mb-1 block text-xs font-medium text-stone-600">{label}</label>
      <select
        name={`${prefix}SubsidyMode`}
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
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
          className="mt-1.5 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
      )}
    </div>
  );
}

export function EmployeePayrollProfileForm({ employee }: { employee: Employee }) {
  const [youngTaxRegime, setYoungTaxRegime] = useState(employee.youngTaxRegime);

  return (
    <form action={updateEmployeePayrollProfile.bind(null, employee.id)} className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="adseBeneficiary"
          defaultChecked={employee.adseBeneficiary}
          className="rounded border-stone-300"
        />
        Beneficiário ADSE
      </label>

      <div>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            name="youngTaxRegime"
            checked={youngTaxRegime}
            onChange={(e) => setYoungTaxRegime(e.target.checked)}
            className="rounded border-stone-300"
          />
          Regime do IRS Jovem
        </label>
        {youngTaxRegime && (
          <input
            name="youngTaxRegimeStartYear"
            type="number"
            min={2000}
            max={2100}
            defaultValue={employee.youngTaxRegimeStartYear ?? new Date().getFullYear()}
            placeholder="Ano de início do regime"
            className="mt-1.5 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Desconto judicial (%, opcional)</label>
        <input
          name="judicialDeductionPercent"
          type="number"
          step="0.01"
          min={0}
          max={100}
          defaultValue={employee.judicialDeductionPercent ?? ""}
          placeholder="Sem desconto judicial"
          className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
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
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
      >
        Guardar
      </button>
    </form>
  );
}
