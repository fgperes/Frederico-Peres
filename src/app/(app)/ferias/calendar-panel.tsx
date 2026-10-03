"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import { VacationCalendar, VacationLegend, type DayMark } from "./calendar";
import { VacationRequestModal } from "./vacation-request-modal";
import { Button } from "@/components/ui";
import { isoDate } from "@/lib/dates";
import type { VacationHeadcount } from "@/lib/vacation";

type ViewMode = "month" | "quarter" | "year";

export function CalendarPanel({
  year,
  marks,
  interactive,
  employeeId,
  employeeName,
  isSelf = true,
  headcount,
  planned,
}: {
  year: number;
  marks: Record<string, DayMark>;
  interactive: boolean;
  employeeId: string;
  employeeName: string;
  isSelf?: boolean;
  headcount: VacationHeadcount;
  planned: number;
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [monthIndex, setMonthIndex] = useState(
    new Date().getFullYear() === year ? new Date().getMonth() : 0
  );
  const [modalOpen, setModalOpen] = useState(false);
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

  const referenceDate = new Date(year, monthIndex, 1);
  const today = new Date();
  const initialModalMonthIso =
    year === today.getFullYear() ? isoDate(new Date(today.getFullYear(), today.getMonth(), 1)) : `${year}-01-01`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="rounded-md border border-stone-300 p-1.5 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="w-12 text-center text-sm font-medium text-stone-700 dark:text-stone-300">
            {year}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            className="rounded-md border border-stone-300 p-1.5 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3">
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
          {interactive && (
            <Button onClick={() => setModalOpen(true)}>
              <CalendarPlus size={14} /> Marcar férias
            </Button>
          )}
        </div>
      </div>

      <VacationLegend />

      <VacationCalendar view={view} referenceDate={referenceDate} marks={marks} />

      {interactive && (
        <VacationRequestModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          employeeId={employeeId}
          employeeName={employeeName}
          isSelf={isSelf}
          initialMonthIso={initialModalMonthIso}
          marks={marks}
          headcount={headcount}
          planned={planned}
        />
      )}
    </div>
  );
}
