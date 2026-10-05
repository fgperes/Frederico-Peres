"use client";

import { useState } from "react";

type ShiftType = "manha" | "tarde" | "folga";

type Cell = { day: number; type: ShiftType; time?: string };

type Row = { name: string; initials: string; color: string; cells: Cell[] };

const DAYS = [
  { day: 2, weekday: "Seg" },
  { day: 3, weekday: "Ter" },
  { day: 4, weekday: "Qua" },
  { day: 5, weekday: "Qui" },
  { day: 6, weekday: "Sex" },
  { day: 7, weekday: "Sáb" },
  { day: 8, weekday: "Dom" },
];

const SHIFT_BADGE: Record<ShiftType, string> = {
  manha: "bg-amber-100 text-amber-800",
  tarde: "bg-sky-100 text-sky-800",
  folga: "border border-dashed border-stone-300 text-stone-400",
};

const SHIFT_LABEL: Record<ShiftType, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  folga: "Folga",
};

const ROWS: Row[] = [
  {
    name: "Beatriz Nunes",
    initials: "BN",
    color: "bg-rose-400",
    cells: [
      { day: 2, type: "manha", time: "08:00–16:00" },
      { day: 3, type: "manha", time: "08:00–16:00" },
      { day: 4, type: "manha", time: "08:00–16:00" },
      { day: 5, type: "folga" },
      { day: 6, type: "tarde", time: "14:00–22:00" },
      { day: 7, type: "tarde", time: "14:00–22:00" },
      { day: 8, type: "folga" },
    ],
  },
  {
    name: "Tiago Mendes",
    initials: "TM",
    color: "bg-sky-500",
    cells: [
      { day: 2, type: "tarde", time: "14:00–22:00" },
      { day: 3, type: "tarde", time: "14:00–22:00" },
      { day: 4, type: "folga" },
      { day: 5, type: "manha", time: "08:00–16:00" },
      { day: 6, type: "manha", time: "08:00–16:00" },
      { day: 7, type: "folga" },
      { day: 8, type: "tarde", time: "14:00–22:00" },
    ],
  },
  {
    name: "Catarina Alves",
    initials: "CA",
    color: "bg-emerald-500",
    cells: [
      { day: 2, type: "manha", time: "09:00–17:00" },
      { day: 3, type: "manha", time: "09:00–17:00" },
      { day: 4, type: "manha", time: "09:00–17:00" },
      { day: 5, type: "manha", time: "09:00–17:00" },
      { day: 6, type: "folga" },
      { day: 7, type: "folga" },
      { day: 8, type: "manha", time: "09:00–17:00" },
    ],
  },
  {
    name: "Rui Fonseca",
    initials: "RF",
    color: "bg-amber-500",
    cells: [
      { day: 2, type: "folga" },
      { day: 3, type: "tarde", time: "14:00–22:00" },
      { day: 4, type: "tarde", time: "14:00–22:00" },
      { day: 5, type: "tarde", time: "14:00–22:00" },
      { day: 6, type: "tarde", time: "14:00–22:00" },
      { day: 7, type: "manha", time: "08:00–16:00" },
      { day: 8, type: "folga" },
    ],
  },
];

export function HorariosDemo() {
  const [selected, setSelected] = useState<{ row: string; cell: Cell } | null>({
    row: ROWS[0].name,
    cell: ROWS[0].cells[0],
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
        <span className="text-xs font-semibold text-stone-600">Semana de 2–8 de março</span>
        <span className="rounded-full bg-violet-600/10 px-2.5 py-1 text-[10px] font-semibold text-violet-700">Publicado</span>
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
            {ROWS.map((row) => (
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
                  if (!cell) return <td key={d.day} />;
                  return (
                    <td key={d.day} className="py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setSelected({ row: row.name, cell })}
                        aria-label={`${row.name} — ${SHIFT_LABEL[cell.type]}`}
                        className={`mx-auto flex h-6 min-w-[30px] items-center justify-center rounded-full px-1.5 text-[9px] font-semibold transition-transform hover:scale-105 ${SHIFT_BADGE[cell.type]}`}
                      >
                        {cell.type === "folga" ? "" : cell.type === "manha" ? "M" : "T"}
                      </button>
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
              — {SHIFT_LABEL[selected.cell.type]}
              {selected.cell.time ? ` — ${selected.cell.time}` : ""}
            </span>
          </>
        ) : (
          <span className="text-stone-400">Clique num turno para ver os detalhes.</span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-stone-100 px-4 py-3 text-[11px] text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-100" />
          Manhã
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-100" />
          Tarde
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-stone-300" />
          Folga
        </span>
      </div>
    </div>
  );
}
