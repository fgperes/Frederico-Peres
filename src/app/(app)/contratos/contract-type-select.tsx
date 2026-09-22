"use client";

import { useState } from "react";

export function ContractTypeSelect({
  contractTypes,
}: {
  contractTypes: { key: string; label: string }[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <select
        name="contractType"
        required
        defaultValue={contractTypes[0]?.key}
        onChange={(e) => setCreating(e.target.value === "__new__")}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
      >
        {contractTypes.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
        <option value="__new__">+ Novo tipo de contrato…</option>
      </select>
      {creating && (
        <input
          name="newContractTypeLabel"
          required
          placeholder="ex.: Estágio Profissional"
          className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
