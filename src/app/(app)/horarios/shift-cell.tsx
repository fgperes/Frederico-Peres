"use client";

import { assignShift } from "./actions";
import type { ShiftTemplate } from "@prisma/client";

export function ShiftCell({
  employeeId,
  date,
  shiftId,
  currentTemplateId,
  templates,
  disabled,
  isDayOff,
}: {
  employeeId: string;
  date: string;
  shiftId?: string;
  currentTemplateId?: string | null;
  templates: ShiftTemplate[];
  disabled?: boolean;
  isDayOff?: boolean;
}) {
  return (
    <form action={assignShift}>
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="date" value={date} />
      {shiftId && <input type="hidden" name="shiftId" value={shiftId} />}
      <select
        name="shiftTemplateId"
        defaultValue={currentTemplateId ?? ""}
        disabled={disabled}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`w-full rounded border px-1 py-1 text-xs disabled:bg-slate-50 disabled:text-slate-400 ${
          isDayOff ? "border-red-200 bg-red-50" : "border-slate-200"
        }`}
        title={isDayOff ? "Ausência aprovada nesta data" : undefined}
      >
        <option value="">—</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </form>
  );
}
