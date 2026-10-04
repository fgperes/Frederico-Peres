"use client";

import { useState } from "react";

type AbsenceType = "ferias" | "baixa" | "aniversario" | "aniversario-empresa";

type Cell = { day: number; type: AbsenceType; label: string; detail: string };

type Row = {
  name: string;
  initials: string;
  color: string;
  team: string;
  location: string;
  cells: Cell[];
};

const DAYS = [
  { day: 2, weekday: "Seg" },
  { day: 3, weekday: "Ter" },
  { day: 4, weekday: "Qua" },
  { day: 5, weekday: "Qui" },
  { day: 6, weekday: "Sex" },
  { day: 7, weekday: "Sáb" },
  { day: 8, weekday: "Dom" },
];

const TYPE_DOT: Record<AbsenceType, string> = {
  ferias: "bg-violet-600",
  baixa: "bg-stone-800",
  aniversario: "border-2 border-stone-300 bg-white",
  "aniversario-empresa": "bg-amber-400",
};

const TYPE_BADGE: Record<AbsenceType, string> = {
  ferias: "bg-violet-600 text-white",
  baixa: "bg-stone-800 text-white",
  aniversario: "border-2 border-stone-300 bg-white",
  "aniversario-empresa": "bg-amber-400 text-white",
};

const LEGEND: { type: AbsenceType; label: string }[] = [
  { type: "ferias", label: "Férias (Pago)" },
  { type: "baixa", label: "Dia de baixa" },
  { type: "aniversario", label: "Aniversário" },
  { type: "aniversario-empresa", label: "Aniversário da Empresa" },
];

const ROWS: Row[] = [
  {
    name: "Beatriz Nunes",
    initials: "BN",
    color: "bg-rose-400",
    team: "Vendas",
    location: "Lisboa",
    cells: [
      { day: 3, type: "ferias", label: "Férias", detail: "3 dias — aprovado" },
      { day: 4, type: "ferias", label: "Férias", detail: "3 dias — aprovado" },
      { day: 5, type: "ferias", label: "Férias", detail: "3 dias — aprovado" },
    ],
  },
  {
    name: "Tiago Mendes",
    initials: "TM",
    color: "bg-sky-500",
    team: "Operações",
    location: "Porto",
    cells: [{ day: 4, type: "baixa", label: "Dia de baixa", detail: "1 dia — pendente" }],
  },
  {
    name: "Catarina Alves",
    initials: "CA",
    color: "bg-emerald-500",
    team: "Marketing",
    location: "Lisboa",
    cells: [{ day: 6, type: "aniversario", label: "Aniversário", detail: "Faz anos hoje" }],
  },
  {
    name: "Rui Fonseca",
    initials: "RF",
    color: "bg-amber-500",
    team: "Vendas",
    location: "Porto",
    cells: [
      { day: 2, type: "ferias", label: "Férias", detail: "1 dia — aprovado" },
      { day: 7, type: "aniversario-empresa", label: "Aniversário da Empresa", detail: "3 anos na people4people" },
    ],
  },
  {
    name: "Marta Dias",
    initials: "MD",
    color: "bg-violet-400",
    team: "Operações",
    location: "Lisboa",
    cells: [
      { day: 5, type: "baixa", label: "Dia de baixa", detail: "2 dias — aprovado" },
      { day: 6, type: "baixa", label: "Dia de baixa", detail: "2 dias — aprovado" },
    ],
  },
];

export function AbsenceCalendarDemo() {
  const [team, setTeam] = useState("todas");
  const [location, setLocation] = useState("todos");
  const [selected, setSelected] = useState<{ row: string; cell: Cell } | null>({
    row: ROWS[0].name,
    cell: ROWS[0].cells[0],
  });

  const teams = ["todas", ...Array.from(new Set(ROWS.map((r) => r.team)))];
  const locations = ["todos", ...Array.from(new Set(ROWS.map((r) => r.location)))];
  const visible = ROWS.filter(
    (r) => (team === "todas" || r.team === team) && (location === "todos" || r.location === location)
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-stone-50 px-4 py-3">
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700"
        >
          {teams.map((t) => (
            <option key={t} value={t}>
              {t === "todas" ? "Todas as equipas" : t}
            </option>
          ))}
        </select>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700"
        >
          {locations.map((l) => (
            <option key={l} value={l}>
              {l === "todos" ? "Todos os locais" : l}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto px-4 pt-3">
        <table className="w-full min-w-[420px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-28" />
              {DAYS.map((d) => (
                <th
                  key={d.day}
                  className={`pb-1.5 text-center text-[10px] font-medium ${
                    d.weekday === "Sáb" || d.weekday === "Dom" ? "text-rose-300" : "text-stone-400"
                  }`}
                >
                  {d.weekday}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.name} className="border-t border-stone-100">
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${row.color}`}
                    >
                      {row.initials}
                    </span>
                    <span className="truncate text-xs font-medium text-stone-700">{row.name}</span>
                  </div>
                </td>
                {DAYS.map((d) => {
                  const cell = row.cells.find((c) => c.day === d.day);
                  return (
                    <td key={d.day} className="py-2 text-center">
                      {cell ? (
                        <button
                          type="button"
                          onClick={() => setSelected({ row: row.name, cell })}
                          aria-label={`${row.name} — ${cell.label}`}
                          className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-transform hover:scale-110 ${TYPE_BADGE[cell.type]}`}
                        >
                          {cell.type === "ferias" || cell.type === "baixa" ? d.day : ""}
                        </button>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mx-4 mt-1 mb-3 min-h-[40px] rounded-xl bg-violet-600/5 px-3 py-2 text-xs">
        {selected ? (
          <>
            <span className="font-semibold text-stone-900">{selected.row}</span>
            <span className="text-stone-500">
              {" "}
              — {selected.cell.label} — {selected.cell.detail}
            </span>
          </>
        ) : (
          <span className="text-stone-400">Clique num dia para ver os detalhes.</span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-stone-100 px-4 py-3 text-[11px] text-stone-500">
        {LEGEND.map((l) => (
          <span key={l.type} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${TYPE_DOT[l.type]}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
