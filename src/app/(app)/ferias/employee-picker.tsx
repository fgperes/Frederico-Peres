"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";

export type PickerEmployee = { id: string; name: string; departmentId: string | null; teamId: string | null };
export type PickerDepartment = { id: string; name: string };
export type PickerTeam = { id: string; name: string; departmentId: string };

// Mesma lógica de agrupamento Departamento > Equipa do seletor de
// colaboradores das Escalas — só que aqui é seleção única (escolher de
// quem ver o calendário), não seleção múltipla.
export function EmployeePicker({
  employees,
  departments,
  teams,
  selectedId,
  basePath = "/ferias",
}: {
  employees: PickerEmployee[];
  departments: PickerDepartment[];
  teams: PickerTeam[];
  selectedId: string;
  basePath?: string;
}) {
  const router = useRouter();
  const selected = employees.find((e) => e.id === selectedId) ?? null;
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        const current = employees.find((emp) => emp.id === selectedId);
        setQuery(current?.name ?? "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [employees, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.name.toLowerCase().includes(q));
  }, [employees, query]);

  const groups = useMemo(() => {
    const byDept = new Map<string, PickerEmployee[]>();
    for (const e of filtered) {
      const key = e.departmentId ?? "__none__";
      const arr = byDept.get(key) ?? [];
      arr.push(e);
      byDept.set(key, arr);
    }
    return byDept;
  }, [filtered]);

  function select(employee: PickerEmployee) {
    setQuery(employee.name);
    setOpen(false);
    router.push(`${basePath}?employeeId=${employee.id}`);
  }

  return (
    <div ref={rootRef} className="relative max-w-sm">
      <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">A ver o calendário de</label>
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder="Escreva para procurar um colaborador..."
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 pr-8 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
        <ChevronsUpDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-stone-400 dark:text-stone-500">
              Sem colaboradores para &quot;{query}&quot;.
            </p>
          ) : (
            [...groups.entries()].map(([deptKey, deptEmployees]) => {
              const dept = departments.find((d) => d.id === deptKey);
              const deptTeams = teams.filter((t) => t.departmentId === deptKey);

              const byTeam = new Map<string, PickerEmployee[]>();
              for (const e of deptEmployees) {
                const key = e.teamId ?? "__none__";
                const arr = byTeam.get(key) ?? [];
                arr.push(e);
                byTeam.set(key, arr);
              }
              const noTeamEmployees = byTeam.get("__none__") ?? [];
              const hasTeamSplit = deptTeams.length > 0 && byTeam.size > (noTeamEmployees.length > 0 ? 1 : 0);

              return (
                <div key={deptKey} className="px-1 py-1">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    {dept?.name ?? "Sem departamento"}
                  </p>
                  {hasTeamSplit
                    ? deptTeams.map((team) => {
                        const teamEmployees = byTeam.get(team.id) ?? [];
                        if (teamEmployees.length === 0) return null;
                        return (
                          <div key={team.id}>
                            <p className="px-3 py-0.5 text-[11px] font-medium text-stone-500 dark:text-stone-400">{team.name}</p>
                            {teamEmployees.map((e) => (
                              <button
                                key={e.id}
                                type="button"
                                onClick={() => select(e)}
                                className={`block w-full px-4 py-1.5 text-left text-sm ${
                                  e.id === selectedId
                                    ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
                                    : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                                }`}
                              >
                                {e.name}
                              </button>
                            ))}
                          </div>
                        );
                      })
                    : null}
                  {(hasTeamSplit ? noTeamEmployees : deptEmployees).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => select(e)}
                      className={`block w-full px-3 py-1.5 text-left text-sm ${
                        e.id === selectedId
                          ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
                          : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                      }`}
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
