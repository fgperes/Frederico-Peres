"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import { assignEmployeesToCycle, removeAssignment } from "./actions";
import { Plus, Minus, X, Search } from "lucide-react";

type DeptEmployee = { id: string; firstName: string; lastName: string; weeklyHours: number; teamId: string | null };
type Department = { id: string; name: string; employees: DeptEmployee[] };
type TeamOption = { id: string; name: string; departmentId: string };
type Assignment = { id: string; employeeId: string; offsetWeeks: number; firstName: string; lastName: string };

export function CycleAssignmentPanel({
  cycleId,
  cycleWeeks,
  departments,
  teams,
  initialAssignments,
  canEdit,
}: {
  cycleId: string;
  cycleWeeks: number;
  departments: Department[];
  teams: TeamOption[];
  initialAssignments: Assignment[];
  canEdit: boolean;
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(departments.map((d) => d.id)));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [offsetWeeks, setOffsetWeeks] = useState(0);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const assignedIds = useMemo(() => new Set(assignments.map((a) => a.employeeId)), [assignments]);

  const filteredDepartments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return departments
      .map((dept) => ({
        ...dept,
        employees: dept.employees.filter((e) => {
          if (assignedIds.has(e.id)) return false;
          if (teamFilter && e.teamId !== teamFilter) return false;
          if (q && !`${e.firstName} ${e.lastName}`.toLowerCase().includes(q)) return false;
          return true;
        }),
      }))
      .filter((dept) => dept.employees.length > 0);
  }, [departments, assignedIds, search, teamFilter]);

  function toggleDept(deptId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  }

  function toggleEmployee(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllInDept(available: DeptEmployee[]) {
    const allSelected = available.length > 0 && available.every((e) => selected.has(e.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const e of available) {
        if (allSelected) next.delete(e.id);
        else next.add(e.id);
      }
      return next;
    });
  }

  function handleAssign() {
    setError(null);
    const employeeIds = [...selected];
    startTransition(async () => {
      const result = await assignEmployeesToCycle(cycleId, employeeIds, offsetWeeks);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAssignments((prev) => [...prev, ...result.data]);
      setSelected(new Set());
      router.refresh();
    });
  }

  function handleRemove(assignmentId: string) {
    startTransition(async () => {
      const result = await removeAssignment(assignmentId, cycleId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Já associados ({assignments.length})
        </p>
        <ul className="space-y-1.5 text-sm">
          {assignments.length === 0 && (
            <li className="text-xs text-stone-500">Sem colaboradores associados ainda.</li>
          )}
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-md border border-stone-200 px-3 py-1.5 dark:border-stone-800"
            >
              <span className="flex items-center gap-2">
                {a.firstName} {a.lastName}
                <Badge color="blue">Semana {a.offsetWeeks + 1}</Badge>
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleRemove(a.id)}
                  disabled={pending}
                  className="text-xs text-rose-600 hover:underline disabled:opacity-60"
                >
                  remover
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {canEdit && (
        <div className="space-y-3 lg:border-l lg:border-stone-200 lg:pl-6 dark:lg:border-stone-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Associar colaboradores
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar colaborador..."
                className="w-full rounded-md border border-stone-300 py-1.5 pl-7 pr-2 text-sm dark:border-stone-700 dark:bg-stone-900"
              />
            </div>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
            >
              <option value="">Todas as equipas</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-stone-200 dark:border-stone-800">
            {filteredDepartments.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-stone-400">Sem colaboradores para associar.</p>
            )}
            {filteredDepartments.map((dept) => {
              const isExpanded = expanded.has(dept.id);
              const selectedInDept = dept.employees.filter((e) => selected.has(e.id)).length;
              return (
                <div key={dept.id} className="border-b border-stone-100 last:border-b-0 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => toggleDept(dept.id)}
                    disabled={dept.employees.length === 0}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-stone-800/60"
                  >
                    <span className="flex items-center gap-2">
                      {dept.name}
                      {selectedInDept > 0 && <Badge color="blue">{selectedInDept} selecionado(s)</Badge>}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-stone-500">
                      {dept.employees.length} disponíve{dept.employees.length === 1 ? "l" : "is"}
                      {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                  {isExpanded && dept.employees.length > 0 && (
                    <div className="space-y-1 px-3 pb-3">
                      <label className="flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                        <input
                          type="checkbox"
                          checked={dept.employees.every((e) => selected.has(e.id))}
                          onChange={() => toggleAllInDept(dept.employees)}
                        />
                        Selecionar todos
                      </label>
                      {dept.employees.map((e) => (
                        <label key={e.id} className="flex items-center gap-2 pl-1 text-sm">
                          <input
                            type="checkbox"
                            checked={selected.has(e.id)}
                            onChange={() => toggleEmployee(e.id)}
                          />
                          {e.firstName} {e.lastName}
                          <span className="text-xs text-stone-400">({e.weeklyHours}h/semana)</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Semana do ciclo em que inicia
            </label>
            <select
              value={offsetWeeks}
              onChange={(e) => setOffsetWeeks(Number(e.target.value))}
              className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
            >
              {Array.from({ length: cycleWeeks }, (_, i) => (
                <option key={i} value={i}>
                  Semana {i + 1}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleAssign}
            disabled={pending || selected.size === 0}
            className="w-full rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-700"
          >
            {pending ? "A associar…" : `Associar ${selected.size > 0 ? `(${selected.size})` : ""}`}
          </button>

          {error && (
            <p className="flex items-start gap-1.5 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
              <X size={14} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
