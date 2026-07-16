"use client";

import { setPatternCell } from "./actions";
import type { ShiftTemplate } from "@prisma/client";

export function PatternCell({
  cycleId,
  weekIndex,
  dayOfWeek,
  currentTemplateId,
  templates,
}: {
  cycleId: string;
  weekIndex: number;
  dayOfWeek: number;
  currentTemplateId?: string | null;
  templates: ShiftTemplate[];
}) {
  return (
    <form action={setPatternCell}>
      <input type="hidden" name="cycleId" value={cycleId} />
      <input type="hidden" name="weekIndex" value={weekIndex} />
      <input type="hidden" name="dayOfWeek" value={dayOfWeek} />
      <select
        name="shiftTemplateId"
        defaultValue={currentTemplateId ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full rounded border border-stone-200 px-1 py-1 text-xs"
      >
        <option value="">Folga</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </form>
  );
}
