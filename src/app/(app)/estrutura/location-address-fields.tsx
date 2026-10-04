"use client";

import { useState } from "react";
import { DISTRICTS, municipalitiesForDistrict } from "@/lib/pt-geo";

const selectBase =
  "rounded-md border border-stone-300 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 disabled:opacity-60";

// Par de selects Distrito → Concelho: o concelho depende do distrito
// escolhido, por isso vive num componente de cliente à parte; os <select>
// continuam dentro do <form> da página (server component) e submetem-se
// normalmente pelo nome (district/municipality).
export function LocationAddressFields({
  defaultDistrict,
  defaultMunicipality,
  variant = "compact",
}: {
  defaultDistrict?: string | null;
  defaultMunicipality?: string | null;
  variant?: "compact" | "labeled";
}) {
  const [district, setDistrict] = useState(defaultDistrict ?? "");
  const municipalities = municipalitiesForDistrict(district);

  const districtSelect = (
    <select
      name="district"
      value={district}
      onChange={(e) => setDistrict(e.target.value)}
      className={`${selectBase} ${variant === "labeled" ? "w-44 px-3 py-2" : "w-full px-2 py-1.5"}`}
    >
      <option value="">{variant === "labeled" ? "Selecionar..." : "Distrito..."}</option>
      {DISTRICTS.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );

  // key={district} força o remount do select ao mudar de distrito, para
  // limpar um concelho que já não pertence à nova lista.
  const municipalitySelect = (
    <select
      key={district}
      name="municipality"
      defaultValue={defaultMunicipality ?? ""}
      disabled={!district}
      className={`${selectBase} ${variant === "labeled" ? "w-44 px-3 py-2" : "w-full px-2 py-1.5"}`}
    >
      <option value="">{variant === "labeled" ? "Selecionar..." : "Concelho..."}</option>
      {municipalities.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );

  if (variant === "labeled") {
    return (
      <>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Distrito</label>
          {districtSelect}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Concelho</label>
          {municipalitySelect}
        </div>
      </>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {districtSelect}
      {municipalitySelect}
    </div>
  );
}
