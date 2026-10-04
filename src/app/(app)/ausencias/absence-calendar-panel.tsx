"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import { AbsenceCalendar, AbsenceLegend, type AbsenceDayMark } from "./absence-calendar";
import { AbsenceRequestModal, type AbsenceSummary, type AbsenceTypeOption } from "./absence-request-modal";
import { Button } from "@/components/ui";

type ViewMode = "month" | "quarter" | "year";

export function AbsenceCalendarPanel({
  year,
  marks,
  absences,
  absenceTypes,
  interactive,
  employeeId,
  employeeName,
  isSelf = true,
}: {
  year: number;
  marks: Record<string, AbsenceDayMark>;
  absences: AbsenceSummary[];
  absenceTypes: AbsenceTypeOption[];
  interactive: boolean;
  employeeId: string;
  employeeName: string;
  isSelf?: boolean;
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [monthIndex, setMonthIndex] = useState(
    new Date().getFullYear() === year ? new Date().getMonth() : 0
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [anchorIso, setAnchorIso] = useState<string | undefined>(undefined);
  const router = useRouter();

  const step = view === "month" ? 1 : view === "quarter" ? 3 : 12;

  function handleDayClick(dateKey: string) {
    if (!interactive) return;
    setAnchorIso(dateKey);
    setModalOpen(true);
  }

  function openBlankModal() {
    setAnchorIso(undefined);
    setModalOpen(true);
  }

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
            <Button onClick={openBlankModal}>
              <CalendarPlus size={14} /> Marcar ausência
            </Button>
          )}
        </div>
      </div>

      {interactive && isSelf && (
        <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
          Clique em &quot;Marcar ausência&quot; ou diretamente num dia livre do calendário para abrir a
          modal — escolha o tipo, selecione os dias e anexe um comprovativo se necessário. Clicar num dia
          já ocupado mostra o detalhe desse pedido.
        </p>
      )}
      {interactive && !isSelf && (
        <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
          Clique em &quot;Marcar ausência&quot; ou diretamente num dia livre do calendário para registar
          uma ausência deste colaborador. Clicar num dia já ocupado mostra o detalhe desse pedido.
        </p>
      )}

      <AbsenceLegend />

      <AbsenceCalendar
        view={view}
        referenceDate={referenceDate}
        marks={marks}
        onDayClick={interactive ? handleDayClick : undefined}
      />

      {interactive && (
        <AbsenceRequestModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          employeeId={employeeId}
          employeeName={employeeName}
          year={year}
          absences={absences}
          absenceTypes={absenceTypes}
          anchorIso={anchorIso}
        />
      )}
    </div>
  );
}
