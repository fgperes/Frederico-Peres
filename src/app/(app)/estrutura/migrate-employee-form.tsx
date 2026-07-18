"use client";

import { useTransition } from "react";
import { ArrowRightLeft } from "lucide-react";
import { migrateEmployeeSection, type MigrateField } from "./actions";

export function MigrateEmployeeForm({
  employeeId,
  field,
  options,
}: {
  employeeId: string;
  field: MigrateField;
  options: { value: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (!value) return;
    startTransition(() => {
      migrateEmployeeSection(employeeId, field, value);
    });
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-1.5">
      <ArrowRightLeft size={12} className="shrink-0 text-stone-400" />
      <select
        defaultValue=""
        disabled={pending}
        onChange={handleChange}
        className="rounded-md border border-stone-300 px-2 py-1 text-xs disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
      >
        <option value="">Migrar para...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
