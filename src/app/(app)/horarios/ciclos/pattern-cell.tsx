"use client";

import { useState, useTransition } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(shiftTemplateId: string) {
    setError(null);
    const formData = new FormData();
    formData.set("cycleId", cycleId);
    formData.set("weekIndex", String(weekIndex));
    formData.set("dayOfWeek", String(dayOfWeek));
    formData.set("shiftTemplateId", shiftTemplateId);
    startTransition(async () => {
      const result = await setPatternCell(formData);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div>
      <select
        defaultValue={currentTemplateId ?? ""}
        disabled={pending}
        onChange={(e) => handleChange(e.currentTarget.value)}
        className="w-full rounded border border-stone-200 px-1 py-1 text-xs disabled:opacity-60"
      >
        <option value="">Folga</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {error && <p className="mt-0.5 text-[10px] text-rose-600">{error}</p>}
    </div>
  );
}
