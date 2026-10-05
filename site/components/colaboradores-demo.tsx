"use client";

import { useState } from "react";

type Status = "ativo" | "ferias" | "baixa";

type Employee = {
  name: string;
  initials: string;
  color: string;
  department: string;
  role: string;
  status: Status;
};

const STATUS_BADGE: Record<Status, string> = {
  ativo: "bg-emerald-50 text-emerald-700",
  ferias: "bg-violet-50 text-violet-700",
  baixa: "bg-amber-50 text-amber-700",
};

const STATUS_LABEL: Record<Status, string> = {
  ativo: "Ativo",
  ferias: "Em férias",
  baixa: "Baixa",
};

const EMPLOYEES: Employee[] = [
  { name: "Beatriz Nunes", initials: "BN", color: "bg-rose-400", department: "Vendas", role: "Account Manager", status: "ativo" },
  { name: "Tiago Mendes", initials: "TM", color: "bg-sky-500", department: "Operações", role: "Técnico de Logística", status: "baixa" },
  { name: "Catarina Alves", initials: "CA", color: "bg-emerald-500", department: "Marketing", role: "Social Media", status: "ativo" },
  { name: "Rui Fonseca", initials: "RF", color: "bg-amber-500", department: "Vendas", role: "Comercial", status: "ferias" },
  { name: "Marta Dias", initials: "MD", color: "bg-violet-400", department: "Operações", role: "Coordenadora de Armazém", status: "ativo" },
  { name: "André Costa", initials: "AC", color: "bg-indigo-400", department: "Marketing", role: "Designer", status: "ativo" },
];

export function ColaboradoresDemo() {
  const [department, setDepartment] = useState("todos");
  const [selected, setSelected] = useState(EMPLOYEES[0]);

  const departments = ["todos", ...Array.from(new Set(EMPLOYEES.map((e) => e.department)))];
  const visible = EMPLOYEES.filter((e) => department === "todos" || e.department === department);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-4 py-3">
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700"
        >
          {departments.map((d) => (
            <option key={d} value={d}>
              {d === "todos" ? "Todos os departamentos" : d}
            </option>
          ))}
        </select>
        <span className="shrink-0 text-xs font-medium text-stone-400">{visible.length} colaboradores</span>
      </div>

      <ul className="divide-y divide-stone-100">
        {visible.map((e) => (
          <li key={e.name}>
            <button
              type="button"
              onClick={() => setSelected(e)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-stone-50 ${
                selected.name === e.name ? "bg-violet-50/60" : ""
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${e.color}`}>
                {e.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-stone-800">{e.name}</span>
                <span className="block truncate text-xs text-stone-500">{e.role}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[e.status]}`}>
                {STATUS_LABEL[e.status]}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="border-t border-stone-100 bg-stone-50 px-4 py-3 text-xs text-stone-500">
        <span className="font-semibold text-stone-700">{selected.name}</span> — {selected.department} · {selected.role}
      </div>
    </div>
  );
}
