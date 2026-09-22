"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

export type SearchableEmployee = { id: string; name: string };

// Filtro de colaboradores por pesquisa livre: escreve para procurar,
// clica para adicionar (fica como "chip" removível). Submete a lista de
// ids selecionados num único campo hidden, tal como os filtros anteriores.
export function EmployeeSearchFilter({
  employees,
  initialSelected,
  fieldName = "employees",
  placeholder = "Escreva para procurar um colaborador...",
}: {
  employees: SearchableEmployee[];
  initialSelected: string[];
  fieldName?: string;
  placeholder?: string;
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees
      .filter((e) => !selected.includes(e.id))
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [employees, selected, query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function addEmployee(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setQuery("");
  }

  function removeEmployee(id: string) {
    setSelected((prev) => prev.filter((v) => v !== id));
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <input type="hidden" name={fieldName} value={selected.join(",")} />

      {selected.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const employee = employeesById.get(id);
            if (!employee) return null;
            return (
              <span
                key={id}
                className="flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
              >
                {employee.name}
                <button
                  type="button"
                  onClick={() => removeEmployee(id)}
                  className="text-violet-500 hover:text-violet-800 dark:hover:text-violet-200"
                  aria-label={`Remover ${employee.name}`}
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (suggestions[0]) addEmployee(suggestions[0].id);
          }
        }}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
      />

      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-stone-200 bg-white py-1 text-sm shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {suggestions.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => addEmployee(e.id)}
                className="block w-full px-3 py-1.5 text-left text-stone-700 hover:bg-violet-50 hover:text-violet-700 dark:text-stone-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
              >
                {e.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
