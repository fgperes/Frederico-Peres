"use client";

import type { ShiftTemplate } from "@prisma/client";

export function PatternCell({
  value,
  onChange,
  disabled,
  templates,
}: {
  value: string | null;
  onChange: (shiftTemplateId: string | null) => void;
  disabled?: boolean;
  templates: ShiftTemplate[];
}) {
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.currentTarget.value || null)}
      className="w-full rounded border border-stone-200 px-1 py-1 text-xs disabled:opacity-60"
    >
      <option value="">Folga</option>
      {templates.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
