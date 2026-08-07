"use client";

import { useState, useTransition } from "react";
import { GripVertical, Copy, Trash2, Plus } from "lucide-react";
import type { ShiftTemplate } from "@prisma/client";
import { PatternCell } from "./pattern-cell";
import { addWeek, duplicateWeek, removeWeek, reorderWeeks } from "./actions";
import { WEEKDAY_LABELS } from "@/lib/dates";

type PatternCellData = {
  weekIndex: number;
  dayOfWeek: number;
  shiftTemplateId: string | null;
};

export function WeeksGrid({
  cycleId,
  weeksCount,
  pattern,
  templates,
  canEdit,
}: {
  cycleId: string;
  weeksCount: number;
  pattern: PatternCellData[];
  templates: ShiftTemplate[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weekIndices = Array.from({ length: weeksCount }, (_, i) => i);

  function patternFor(weekIndex: number, dayOfWeek: number) {
    return pattern.find((p) => p.weekIndex === weekIndex && p.dayOfWeek === dayOfWeek);
  }

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocorreu um erro. Tente novamente.");
      }
    });
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const order = [...weekIndices];
    const [moved] = order.splice(dragIndex, 1);
    order.splice(targetIndex, 0, moved);
    setDragIndex(null);
    setDragOverIndex(null);
    run(() => reorderWeeks(cycleId, order));
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </p>
      )}
      <div className={pending ? "pointer-events-none opacity-60 transition-opacity" : ""}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="text-xs uppercase text-stone-500">
            <tr>
              {canEdit && <th className="w-6 px-1 py-2"></th>}
              <th className="px-2 py-2">Semana</th>
              {WEEKDAY_LABELS.map((d) => (
                <th key={d} className="px-2 py-2 text-center">
                  {d}
                </th>
              ))}
              {canEdit && <th className="px-2 py-2 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {weekIndices.map((weekIndex, position) => (
              <tr
                key={weekIndex}
                draggable={canEdit}
                onDragStart={() => setDragIndex(position)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverIndex(position);
                }}
                onDrop={() => handleDrop(position)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                className={
                  dragOverIndex === position && dragIndex !== null && dragIndex !== position
                    ? "bg-violet-50"
                    : ""
                }
              >
                {canEdit && (
                  <td className="cursor-grab px-1 py-2 text-stone-400 active:cursor-grabbing">
                    <GripVertical size={15} />
                  </td>
                )}
                <td className="px-2 py-2 font-medium text-stone-700">
                  Semana {position + 1}
                </td>
                {Array.from({ length: 7 }, (_, dayOfWeek) => (
                  <td key={dayOfWeek} className="px-2 py-2">
                    {canEdit ? (
                      <PatternCell
                        cycleId={cycleId}
                        weekIndex={weekIndex}
                        dayOfWeek={dayOfWeek}
                        currentTemplateId={patternFor(weekIndex, dayOfWeek)?.shiftTemplateId}
                        templates={templates}
                      />
                    ) : (
                      <span className="text-xs text-stone-500">
                        {templates.find(
                          (t) => t.id === patternFor(weekIndex, dayOfWeek)?.shiftTemplateId
                        )?.name ?? "Folga"}
                      </span>
                    )}
                  </td>
                ))}
                {canEdit && (
                  <td className="px-2 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="Duplicar semana"
                        onClick={() => run(() => duplicateWeek(cycleId, weekIndex))}
                        className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 hover:text-violet-700"
                      >
                        <Copy size={14} />
                      </button>
                      {weeksCount > 1 && (
                        <button
                          type="button"
                          title="Remover semana"
                          onClick={() => {
                            if (confirm(`Remover a Semana ${position + 1}? Esta ação não pode ser desfeita.`)) {
                              run(() => removeWeek(cycleId, weekIndex));
                            }
                          }}
                          className="rounded-md p-1.5 text-stone-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={() => run(() => addWeek(cycleId))}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm font-medium text-stone-600 hover:border-violet-400 hover:text-violet-700"
        >
          <Plus size={15} />
          Adicionar semana
        </button>
      )}
      </div>
    </div>
  );
}
