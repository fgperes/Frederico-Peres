"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

export type TreeEmployee = { id: string; name: string; departmentId: string | null };
export type TreeDepartment = { id: string; name: string };

export function EmployeeTree({
  departments,
  employees,
  selected,
  onChange,
}: {
  departments: TreeDepartment[];
  employees: TreeEmployee[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [search, setSearch] = useState("");

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.name.toLowerCase().includes(q));
  }, [employees, search]);

  const filteredIds = useMemo(() => new Set(filteredEmployees.map((e) => e.id)), [filteredEmployees]);
  const allSelected = filteredEmployees.length > 0 && filteredEmployees.every((e) => selected.has(e.id));

  const groups = useMemo(() => {
    const byDept = new Map<string, TreeEmployee[]>();
    for (const e of filteredEmployees) {
      const key = e.departmentId ?? "__none__";
      const arr = byDept.get(key) ?? [];
      arr.push(e);
      byDept.set(key, arr);
    }
    return byDept;
  }, [filteredEmployees]);

  function toggleAll() {
    const next = new Set(selected);
    if (allSelected) {
      for (const id of filteredIds) next.delete(id);
    } else {
      for (const id of filteredIds) next.add(id);
    }
    onChange(next);
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function toggleDept(deptEmployees: TreeEmployee[]) {
    const next = new Set(selected);
    const allIn = deptEmployees.every((e) => next.has(e.id));
    for (const e of deptEmployees) {
      if (allIn) next.delete(e.id);
      else next.add(e.id);
    }
    onChange(next);
  }

  return (
    <div>
      <div className="relative mb-2">
        <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar colaborador..."
          className="w-full rounded-md border border-stone-300 py-1.5 pl-7 pr-2 text-xs dark:border-stone-700 dark:bg-stone-800"
        />
      </div>
      <div className="max-h-72 overflow-y-auto rounded-md border border-stone-200 p-2 dark:border-stone-700">
        <label className="flex items-center gap-2 border-b border-stone-100 pb-1.5 text-sm font-medium text-stone-800 dark:border-stone-800 dark:text-stone-200">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-stone-300" />
          Todos
          <span className="ml-auto text-xs font-normal text-stone-400">{selected.size} selecionado(s)</span>
        </label>

        {[...groups.entries()].map(([deptKey, deptEmployees]) => {
          const dept = departments.find((d) => d.id === deptKey);
          const deptAllSelected = deptEmployees.every((e) => selected.has(e.id));
          return (
            <div key={deptKey} className="mt-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                <input
                  type="checkbox"
                  checked={deptAllSelected}
                  onChange={() => toggleDept(deptEmployees)}
                  className="h-3.5 w-3.5 rounded border-stone-300"
                />
                {dept?.name ?? "Sem departamento"}
              </label>
              <div className="mt-1 space-y-1 pl-5">
                {deptEmployees.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                    <input
                      type="checkbox"
                      checked={selected.has(e.id)}
                      onChange={() => toggleOne(e.id)}
                      className="h-4 w-4 rounded border-stone-300"
                    />
                    {e.name}
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        {filteredEmployees.length === 0 && (
          <p className="py-3 text-center text-xs text-stone-400">Sem colaboradores para &quot;{search}&quot;.</p>
        )}
      </div>
    </div>
  );
}
