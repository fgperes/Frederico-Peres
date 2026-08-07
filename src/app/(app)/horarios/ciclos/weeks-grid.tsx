"use client";

import { useMemo, useState, useTransition } from "react";
import { GripVertical, Copy, Trash2, Plus } from "lucide-react";
import type { ShiftTemplate } from "@prisma/client";
import { PatternCell } from "./pattern-cell";
import { addWeek, duplicateWeek, removeWeek, reorderWeeks, savePattern } from "./actions";
import { WEEKDAY_LABELS } from "@/lib/dates";

type PatternCellData = {
  weekIndex: number;
  dayOfWeek: number;
  shiftTemplateId: string | null;
};

function cellKey(weekIndex: number, dayOfWeek: number) {
  return `${weekIndex}-${dayOfWeek}`;
}

function buildCellMap(pattern: PatternCellData[]) {
  const map = new Map<string, string | null>();
  for (const p of pattern) map.set(cellKey(p.weekIndex, p.dayOfWeek), p.shiftTemplateId);
  return map;
}

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
  const [savePending, startSaveTransition] = useTransition();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cells, setCells] = useState<Map<string, string | null>>(() => buildCellMap(pattern));
  // Guarda a última versão do padrão do servidor já refletida em `cells`,
  // para detetar (durante a renderização, sem useEffect) quando `pattern`
  // mudou por fora — ex.: depois de adicionar/remover/reordenar semanas.
  const [syncedPattern, setSyncedPattern] = useState(pattern);

  const currentSignature = useMemo(() => JSON.stringify([...cells.entries()].sort()), [cells]);
  const syncedSignature = useMemo(
    () => JSON.stringify([...buildCellMap(syncedPattern).entries()].sort()),
    [syncedPattern]
  );
  const dirty = syncedSignature !== currentSignature;

  if (pattern !== syncedPattern && !dirty) {
    setCells(buildCellMap(pattern));
    setSyncedPattern(pattern);
  }

  const weekIndices = Array.from({ length: weeksCount }, (_, i) => i);
  const structuralDisabled = pending || dirty;

  function run(action: () => Promise<{ ok: true; data: unknown } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  function handleCellChange(weekIndex: number, dayOfWeek: number, shiftTemplateId: string | null) {
    setCells((prev) => {
      const next = new Map(prev);
      next.set(cellKey(weekIndex, dayOfWeek), shiftTemplateId);
      return next;
    });
  }

  function handleSave() {
    setError(null);
    const payload = [...cells.entries()].map(([key, shiftTemplateId]) => {
      const [weekIndex, dayOfWeek] = key.split("-").map(Number);
      return { weekIndex, dayOfWeek, shiftTemplateId };
    });
    startSaveTransition(async () => {
      const result = await savePattern(cycleId, payload);
      if (!result.ok) setError(result.error);
    });
  }

  function handleDiscard() {
    setCells(buildCellMap(pattern));
    setError(null);
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
        <p className="mb-3 whitespace-pre-line rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </p>
      )}
      <div className={pending || savePending ? "pointer-events-none opacity-60 transition-opacity" : ""}>
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
                draggable={canEdit && !structuralDisabled}
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
                  <td
                    className={`px-1 py-2 text-stone-400 ${structuralDisabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}`}
                  >
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
                        value={cells.get(cellKey(weekIndex, dayOfWeek)) ?? null}
                        onChange={(shiftTemplateId) => handleCellChange(weekIndex, dayOfWeek, shiftTemplateId)}
                        disabled={savePending}
                        templates={templates}
                      />
                    ) : (
                      <span className="text-xs text-stone-500">
                        {templates.find((t) => t.id === cells.get(cellKey(weekIndex, dayOfWeek)))?.name ?? "Folga"}
                      </span>
                    )}
                  </td>
                ))}
                {canEdit && (
                  <td className="px-2 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title={structuralDisabled ? "Grave as alterações do padrão primeiro" : "Duplicar semana"}
                        disabled={structuralDisabled}
                        onClick={() => run(() => duplicateWeek(cycleId, weekIndex))}
                        className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                      >
                        <Copy size={14} />
                      </button>
                      {weeksCount > 1 && (
                        <button
                          type="button"
                          title={structuralDisabled ? "Grave as alterações do padrão primeiro" : "Remover semana"}
                          disabled={structuralDisabled}
                          onClick={() => {
                            if (confirm(`Remover a Semana ${position + 1}? Esta ação não pode ser desfeita.`)) {
                              run(() => removeWeek(cycleId, weekIndex));
                            }
                          }}
                          className="rounded-md p-1.5 text-stone-500 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={structuralDisabled}
            onClick={() => run(() => addWeek(cycleId))}
            title={structuralDisabled ? "Grave as alterações do padrão primeiro" : undefined}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm font-medium text-stone-600 hover:border-violet-400 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-stone-300 disabled:hover:text-stone-600"
          >
            <Plus size={15} />
            Adicionar semana
          </button>

          <div className="ml-auto flex items-center gap-2">
            {dirty && (
              <button
                type="button"
                disabled={savePending}
                onClick={handleDiscard}
                className="rounded-lg px-3 py-2 text-sm font-medium text-stone-500 hover:text-stone-700 disabled:opacity-50"
              >
                Descartar
              </button>
            )}
            <button
              type="button"
              disabled={!dirty || savePending}
              onClick={handleSave}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savePending ? "A gravar…" : "Guardar alterações"}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
