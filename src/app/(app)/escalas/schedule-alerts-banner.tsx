"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Moon, Users2, Clock, CalendarDays, type LucideIcon } from "lucide-react";
import type { ScheduleAlert, ScheduleAlertType } from "@/lib/schedule-alerts";

const TYPE_META: Record<ScheduleAlertType, { label: string; icon: LucideIcon }> = {
  REST: { label: "Descanso insuficiente (< 11h)", icon: Moon },
  OVERLAP: { label: "Turnos sobrepostos", icon: Users2 },
  EXCESS_HOURS: { label: "Excesso de horas semanais", icon: Clock },
  CONSECUTIVE_DAYS: { label: "Dias seguidos sem folga", icon: CalendarDays },
};

// Resumo dos alertas detetados na vista atual (não bloqueiam nada — a
// geração automática já respeita estas regras; isto avisa sobre turnos
// criados/editados manualmente, incluindo depois de publicados).
export function ScheduleAlertsBanner({ alerts }: { alerts: ScheduleAlert[] }) {
  const [open, setOpen] = useState(false);
  if (alerts.length === 0) return null;

  const grouped = new Map<ScheduleAlertType, ScheduleAlert[]>();
  for (const a of alerts) {
    const arr = grouped.get(a.type) ?? [];
    arr.push(a);
    grouped.set(a.type, arr);
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium text-amber-800 dark:text-amber-400"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle size={15} /> {alerts.length} alerta{alerts.length > 1 ? "s" : ""} nesta vista
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-amber-200 px-4 py-3 dark:border-amber-500/30">
          {[...grouped.entries()].map(([type, items]) => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            return (
              <div key={type}>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  <Icon size={12} /> {meta.label} ({items.length})
                </p>
                <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-800 dark:text-amber-300">
                  {items.map((a, i) => (
                    <li key={i}>{a.message}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
