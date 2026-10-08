"use client";

import { useRouter } from "next/navigation";
import { SearchableSelect, type SearchableOption } from "@/components/searchable-select";

export function RubricasEmployeeFilter({
  options,
  defaultValue,
}: {
  options: SearchableOption[];
  defaultValue: string;
}) {
  const router = useRouter();
  return (
    <div className="w-64">
      <SearchableSelect
        name="employeeId"
        defaultValue={defaultValue}
        placeholder="Todos os colaboradores"
        options={options}
        onChange={(value) => router.push(value ? `?employeeId=${value}` : "?")}
      />
    </div>
  );
}
