"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { VacationCalendar, type DayMark } from "./calendar";
import { toggleVacationDay } from "./actions";
import { SaveBanner, useSaveFeedback } from "@/components/save-banner";

type ViewMode = "month" | "quarter" | "year";

export function CalendarPanel({
  year,
  marks,
  interactive,
}: {
  year: number;
  marks: Record<string, DayMark>;
  interactive: boolean;
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [monthIndex, setMonthIndex] = useState(
    new Date().getFullYear() === year ? new Date().getMonth() : 0
  );
  const [pending, startTransition] = useTransition();
  const { status, message, run } = useSaveFeedback();
  const router = useRouter();

  const step = view === "month" ? 1 : view === "quarter" ? 3 : 12;

  function shift(dir: 1 | -1) {
    const next = monthIndex + dir * step;
    if (next < 0) {
      router.push(`?year=${year - 1}`);
      return;
    }
    if (next > 11) {
      router.push(`?year=${year + 1}`);
      return;
    }
    setMonthIndex(next);
  }

  function handleDayClick(dateKey: string) {
    if (!interactive) return;
    startTransition(() => {
      run(async () => {
        const formData = new FormData();
        formData.set("date", dateKey);
        await toggleVacationDay(formData);
        router.refresh();
      }, "Calendário atualizado.");
    });
  }

  const referenceDate = new Date(year, monthIndex, 1);

  return (
    <div>
      <SaveBanner status={status} message={message} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            disabled={pending}
            className="rounded-md border border-stone-300 p-1.5 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:hover:bg-stone-800"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="w-12 text-center text-sm font-medium text-stone-700 dark:text-stone-300">
            {year}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            disabled={pending}
            className="rounded-md border border-stone-300 p-1.5 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:hover:bg-stone-800"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex rounded-md border border-stone-300 p-0.5 text-xs dark:border-stone-700">
          {(["month", "quarter", "year"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded px-2.5 py-1 font-medium ${
                view === v
                  ? "bg-violet-600 text-white"
                  : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              {v === "month" ? "Mensal" : v === "quarter" ? "Trimestral" : "Anual"}
            </button>
          ))}
        </div>
      </div>

      {interactive && (
        <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
          Clique num dia útil para pedir férias (fica <strong>amarelo</strong>, pendente de aprovação).
          Depois de aprovado fica <strong>verde</strong>. Clique novamente para cancelar.
        </p>
      )}

      <VacationCalendar
        view={view}
        referenceDate={referenceDate}
        marks={marks}
        onDayClick={interactive ? handleDayClick : undefined}
      />
    </div>
  );
}
