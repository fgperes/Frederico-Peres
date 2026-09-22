"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export type TreeDepartment = { id: string; name: string };
export type TreeTeam = { id: string; name: string; departmentId: string };
export type TreeEmployee = {
  id: string;
  name: string;
  departmentId: string | null;
  teamId: string | null;
};

type GroupState = "none" | "some" | "all";

function groupState(ids: string[], selected: Set<string>): GroupState {
  if (ids.length === 0) return "none";
  const count = ids.filter((id) => selected.has(id)).length;
  if (count === 0) return "none";
  return count === ids.length ? "all" : "some";
}

// Checkbox tri-state (marcado/indeterminado/desmarcado) — o atributo
// `indeterminate` só existe no DOM, não como prop React, por isso é
// aplicado via ref.
function TriCheckbox({
  state,
  onChange,
  className = "",
}: {
  state: GroupState;
  onChange: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === "all"}
      onChange={onChange}
      className={`h-3.5 w-3.5 rounded border-stone-300 text-violet-600 focus:ring-violet-500 ${className}`}
    />
  );
}

export function EmployeeTreeFilter({
  departments,
  teams,
  employees,
  initialSelected,
  fieldName = "employees",
}: {
  departments: TreeDepartment[];
  teams: TreeTeam[];
  employees: TreeEmployee[];
  initialSelected: string[];
  fieldName?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));

  const employeeIdsByDept = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const e of employees) {
      if (!e.departmentId) continue;
      if (!map.has(e.departmentId)) map.set(e.departmentId, []);
      map.get(e.departmentId)!.push(e.id);
    }
    return map;
  }, [employees]);

  const employeeIdsByTeam = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const e of employees) {
      if (!e.teamId) continue;
      if (!map.has(e.teamId)) map.set(e.teamId, []);
      map.get(e.teamId)!.push(e.id);
    }
    return map;
  }, [employees]);

  const teamsByDept = useMemo(() => {
    const map = new Map<string, TreeTeam[]>();
    for (const t of teams) {
      if (!map.has(t.departmentId)) map.set(t.departmentId, []);
      map.get(t.departmentId)!.push(t);
    }
    return map;
  }, [teams]);

  const employeesWithoutDept = useMemo(
    () => employees.filter((e) => !e.departmentId),
    [employees]
  );

  const toggleIds = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const summaryLabel =
    selected.size === 0
      ? "Todos os colaboradores"
      : `${selected.size} colaborador${selected.size > 1 ? "es" : ""} selecionado${selected.size > 1 ? "s" : ""}`;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input type="hidden" name={fieldName} value={Array.from(selected).join(",")} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-stone-300 bg-white px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
      >
        <span>{summaryLabel}</span>
        <ChevronDown size={14} className={`text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto rounded-md border border-stone-300 bg-white p-2 text-sm shadow-lg dark:border-stone-700 dark:bg-stone-800">
        {departments.map((dept) => {
          const deptEmployeeIds = employeeIdsByDept.get(dept.id) ?? [];
          const deptState = groupState(deptEmployeeIds, selected);
          const deptTeams = teamsByDept.get(dept.id) ?? [];
          const directEmployees = employees.filter(
            (e) => e.departmentId === dept.id && !e.teamId
          );

          return (
            <div key={dept.id} className="mb-1.5">
              <label className="flex cursor-pointer items-center gap-1.5 py-0.5 font-medium text-stone-800 dark:text-stone-100">
                <TriCheckbox state={deptState} onChange={() => toggleIds(deptEmployeeIds)} />
                {dept.name}
              </label>

              <div className="ml-4 border-l border-stone-100 pl-2 dark:border-stone-700">
                {deptTeams.map((team) => {
                  const teamEmployeeIds = employeeIdsByTeam.get(team.id) ?? [];
                  const teamState = groupState(teamEmployeeIds, selected);
                  return (
                    <div key={team.id} className="mb-1">
                      <label className="flex cursor-pointer items-center gap-1.5 py-0.5 text-stone-700 dark:text-stone-300">
                        <TriCheckbox state={teamState} onChange={() => toggleIds(teamEmployeeIds)} />
                        {team.name}
                      </label>
                      <div className="ml-4 border-l border-stone-100 pl-2 dark:border-stone-700">
                        {employees
                          .filter((e) => e.teamId === team.id)
                          .map((e) => (
                            <label
                              key={e.id}
                              className="flex cursor-pointer items-center gap-1.5 py-0.5 text-stone-600 dark:text-stone-400"
                            >
                              <input
                                type="checkbox"
                                checked={selected.has(e.id)}
                                onChange={() => toggleOne(e.id)}
                                className="h-3.5 w-3.5 rounded border-stone-300 text-violet-600 focus:ring-violet-500"
                              />
                              {e.name}
                            </label>
                          ))}
                      </div>
                    </div>
                  );
                })}

                {directEmployees.map((e) => (
                  <label
                    key={e.id}
                    className="flex cursor-pointer items-center gap-1.5 py-0.5 text-stone-600 dark:text-stone-400"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(e.id)}
                      onChange={() => toggleOne(e.id)}
                      className="h-3.5 w-3.5 rounded border-stone-300 text-violet-600 focus:ring-violet-500"
                    />
                    {e.name}
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        {employeesWithoutDept.length > 0 && (
          <div className="mb-1.5">
            <p className="py-0.5 font-medium text-stone-500 dark:text-stone-400">Sem departamento</p>
            <div className="ml-4 border-l border-stone-100 pl-2 dark:border-stone-700">
              {employeesWithoutDept.map((e) => (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-center gap-1.5 py-0.5 text-stone-600 dark:text-stone-400"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggleOne(e.id)}
                    className="h-3.5 w-3.5 rounded border-stone-300 text-violet-600 focus:ring-violet-500"
                  />
                  {e.name}
                </label>
              ))}
            </div>
          </div>
        )}

          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="mt-1.5 w-full border-t border-stone-100 pt-1.5 text-left text-xs text-stone-500 underline hover:text-stone-700 dark:border-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Limpar seleção ({selected.size})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
