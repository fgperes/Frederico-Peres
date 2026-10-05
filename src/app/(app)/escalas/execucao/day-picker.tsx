import Link from "next/link";
import { isoDate, WEEKDAY_LABELS } from "@/lib/dates";

// Sete dias da semana selecionada — navega dentro da mesma semana sem
// recarregar o seletor de semana. WEEKDAY_LABELS começa em Segunda, tal
// como weekDays (getWeekStart usa weekStartsOn: 1).
export function DayPicker({
  weekDays,
  selectedDay,
  week,
  filterSuffix,
}: {
  weekDays: Date[];
  selectedDay: string;
  week: string;
  filterSuffix: string;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {weekDays.map((d, i) => {
        const iso = isoDate(d);
        const active = iso === selectedDay;
        return (
          <Link
            key={iso}
            href={`/escalas/execucao?week=${week}&day=${iso}${filterSuffix}`}
            prefetch={false}
            className={`flex shrink-0 flex-col items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-violet-600 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
            }`}
          >
            <span>{WEEKDAY_LABELS[i]}</span>
            <span className="opacity-80">{d.getDate()}</span>
          </Link>
        );
      })}
    </div>
  );
}
