"use client";

import { useState } from "react";
import { OPERATING_HOURS_DAY_LABELS } from "./operating-hours-constants";

export type OperatingHoursRow = {
  dayOfWeek: number | null;
  isHoliday: boolean;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

function emptyRows(): OperatingHoursRow[] {
  const rows: OperatingHoursRow[] = [];
  for (let dow = 0; dow <= 6; dow++) {
    rows.push({ dayOfWeek: dow, isHoliday: false, isClosed: false, openTime: "09:00", closeTime: "18:00" });
  }
  rows.push({ dayOfWeek: null, isHoliday: true, isClosed: true, openTime: null, closeTime: null });
  return rows;
}

export function OperatingHoursEditor({
  action,
  existingRows,
}: {
  action: (formData: FormData) => void;
  existingRows: OperatingHoursRow[];
}) {
  const base = emptyRows();
  const rows = base.map((row) => {
    const existing = existingRows.find((r) => r.isHoliday === row.isHoliday && r.dayOfWeek === row.dayOfWeek);
    return existing ?? row;
  });

  const [closed, setClosed] = useState<boolean[]>(rows.map((r) => r.isClosed));

  return (
    <form action={action} className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-stone-500 dark:text-stone-400">
              <th className="py-1.5 pr-3">Dia</th>
              <th className="py-1.5 pr-3">Encerrado</th>
              <th className="py-1.5 pr-3">Abertura</th>
              <th className="py-1.5">Fecho</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const key = row.isHoliday ? "holiday" : String(row.dayOfWeek);
              const label = row.isHoliday ? "Feriados" : OPERATING_HOURS_DAY_LABELS[row.dayOfWeek!];
              const isClosed = closed[i];
              return (
                <tr key={key} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="py-1.5 pr-3 font-medium text-stone-700 dark:text-stone-300">{label}</td>
                  <td className="py-1.5 pr-3">
                    <input
                      type="checkbox"
                      name={`closed_${key}`}
                      defaultChecked={row.isClosed}
                      onChange={(e) =>
                        setClosed((prev) => prev.map((v, idx) => (idx === i ? e.target.checked : v)))
                      }
                      className="h-4 w-4 rounded border-stone-300 text-violet-600 dark:border-stone-700"
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      type="time"
                      name={`open_${key}`}
                      defaultValue={row.openTime ?? ""}
                      disabled={isClosed}
                      className="w-28 rounded-md border border-stone-300 px-2 py-1 text-sm disabled:opacity-40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                    />
                  </td>
                  <td className="py-1.5">
                    <input
                      type="time"
                      name={`close_${key}`}
                      defaultValue={row.closeTime ?? ""}
                      disabled={isClosed}
                      className="w-28 rounded-md border border-stone-300 px-2 py-1 text-sm disabled:opacity-40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        type="submit"
        className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
      >
        Guardar horário
      </button>
    </form>
  );
}
