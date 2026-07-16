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
        className={`w-full rounded border px-1 py-1 text-xs disabled:bg-stone-50 disabled:text-stone-500 ${
          isDayOff ? "border-rose-200 bg-rose-50" : "border-stone-200"
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
