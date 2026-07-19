"use client";

import { useRouter } from "next/navigation";
import { SearchableSelect } from "@/components/searchable-select";

export function EmployeePicker({
  employees,
  selectedId,
}: {
  employees: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <div className="max-w-sm">
      <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
        A ver o calendário de
      </label>
      <SearchableSelect
        name="employeeId"
        defaultValue={selectedId}
        placeholder="Escreva para procurar um colaborador..."
        options={employees.map((e) => ({ value: e.id, label: e.name }))}
        onChange={(value) => {
          if (value) router.push(`/ferias?employeeId=${value}`);
        }}
      />
    </div>
  );
}
