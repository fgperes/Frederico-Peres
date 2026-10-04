"use client";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export type AbsenceDayMark = {
  status: "PENDING" | "APPROVED" | "REJECTED";
  typeName: string;
  absenceId: string;
};

const LEGEND_ITEMS: { color: string; label: string }[] = [
  { color: "bg-amber-400", label: "Pendente de aprovação" },
  { color: "bg-emerald-500", label: "Aprovado" },
  { color: "bg-rose-400", label: "Rejeitado" },
];

export function AbsenceLegend() {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-600 dark:text-stone-400">
      {LEGEND_ITEMS.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={`h-3 w-3 shrink-0 rounded ${item.color}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthWeeks(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function MonthGrid({
  year,
  month,
  marks,
  compact,
  onDayClick,
}: {
  year: number;
  month: number;
  marks: Record<string, AbsenceDayMark>;
  compact?: boolean;
  onDayClick?: (dateKey: string) => void;
}) {
  const weeks = buildMonthWeeks(year, month);
  const today = toKey(new Date());

  return (
    <div>
      <h4 className={`mb-2 font-medium text-stone-700 dark:text-stone-300 ${compact ? "text-xs" : "text-sm"}`}>
        {MONTH_LABELS[month]} {year}
      </h4>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {WEEKDAY_LABELS.map((w) => (
              <th
                key={w}
                className={`pb-1 text-center font-medium text-stone-400 dark:text-stone-600 ${compact ? "text-[9px]" : "text-[10px]"}`}
              >
                {compact ? w.slice(0, 1) : w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((day, j) => {
                if (!day) return <td key={j} className={compact ? "h-6" : "h-9"} />;
                const key = toKey(day);
                const mark = marks[key];
                const isToday = key === today;
                const clickable = !!onDayClick;

                let cellClasses = compact ? "h-6 rounded text-[10px]" : "h-9 rounded-md text-xs";
                cellClasses += " flex items-center justify-center font-medium transition-colors";

                if (mark?.status === "APPROVED") {
                  cellClasses += " bg-emerald-500 text-white";
                } else if (mark?.status === "REJECTED") {
                  cellClasses += " bg-rose-400 text-white";
                } else if (mark?.status === "PENDING") {
                  cellClasses += " bg-amber-400 text-white";
                } else {
                  cellClasses += clickable
                    ? " text-stone-600 hover:bg-violet-50 dark:text-stone-300 dark:hover:bg-violet-500/10 cursor-pointer"
                    : " text-stone-500 dark:text-stone-400";
                }

                if (isToday && !mark) cellClasses += " ring-1 ring-inset ring-violet-400";

                const title = mark ? `${mark.typeName} (${day.toLocaleDateString("pt-PT")})` : day.toLocaleDateString("pt-PT");

                return (
                  <td key={j} className="p-0.5 text-center">
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => onDayClick?.(key)}
                      title={title}
                      className={`w-full ${cellClasses} ${!clickable ? "cursor-default" : ""}`}
                    >
                      {day.getDate()}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AbsenceCalendar({
  view,
  referenceDate,
  marks,
  onDayClick,
}: {
  view: "month" | "quarter" | "year";
  referenceDate: Date;
  marks: Record<string, AbsenceDayMark>;
  onDayClick?: (dateKey: string) => void;
}) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  if (view === "month") {
    return <MonthGrid year={year} month={month} marks={marks} onDayClick={onDayClick} />;
  }

  if (view === "quarter") {
    const quarterStart = month - (month % 3);
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <MonthGrid key={i} year={year} month={quarterStart + i} marks={marks} onDayClick={onDayClick} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }, (_, i) => (
        <MonthGrid key={i} year={year} month={i} marks={marks} onDayClick={onDayClick} compact />
      ))}
    </div>
  );
}
