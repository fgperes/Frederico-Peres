"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { ChevronDown, ChevronRight } from "lucide-react";

export type ContractGroupEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string | null;
  status: string;
  version: number;
};

export type ContractGroup = {
  key: string;
  contractTypeLabel: string;
  weeklyHours: number;
  weeklyRestDays: number;
  entries: ContractGroupEntry[];
};

const STATUS_COLOR: Record<string, "green" | "amber" | "slate"> = {
  ACTIVE: "green",
  EXPIRED: "amber",
  TERMINATED: "slate",
};

// Um "contrato" nesta listagem é um perfil de condições (tipo + horas +
// folgas) — pode aplicar-se a vários colaboradores, por isso aparece só
// uma vez, com a lista de quem se enquadra nessa condição por baixo.
export function ContractGroupsTable({ groups }: { groups: ContractGroup[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="divide-y divide-stone-100">
      {groups.map((group) => {
        const isOpen = expanded.has(group.key);
        return (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-stone-50"
            >
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown size={14} className="text-stone-400" />
                ) : (
                  <ChevronRight size={14} className="text-stone-400" />
                )}
                <span className="font-medium text-stone-900">{group.contractTypeLabel}</span>
                <span className="text-sm text-stone-500">
                  {group.weeklyHours}h/semana · {group.weeklyRestDays} folga(s)
                </span>
              </div>
              <span className="text-xs font-medium text-stone-500">
                {group.entries.length} colaborador{group.entries.length > 1 ? "es" : ""}
              </span>
            </button>

            {isOpen && (
              <div className="overflow-x-auto bg-stone-50/60 px-4 pb-3">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="py-2 pr-4">Colaborador</th>
                      <th className="py-2 pr-4">Início</th>
                      <th className="py-2 pr-4">Fim</th>
                      <th className="py-2 pr-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {group.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="py-2 pr-4">
                          <Link href={`/contratos/${entry.id}`} className="font-medium text-violet-700 hover:underline">
                            {entry.employeeName}
                          </Link>
                          {entry.version > 1 && (
                            <span className="ml-2 text-xs text-stone-500">v{entry.version}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">{entry.startDate}</td>
                        <td className="py-2 pr-4">{entry.endDate ?? "—"}</td>
                        <td className="py-2 pr-4">
                          <Badge color={STATUS_COLOR[entry.status] ?? "slate"}>{entry.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
