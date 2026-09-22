"use client";

import { useRouter } from "next/navigation";
import { isoDate, MONTH_LABELS } from "@/lib/dates";

// Seleção direta de mês/ano para a vista mensal — as setas Anterior/Seguinte
// só avançam um mês de cada vez, o que é lento para saltar para um mês
// distante. Auto-navega ao mudar qualquer um dos dois <select>.
export function MonthYearPicker({
  year,
  month,
  filterQuery,
}: {
  year: number;
  month: number;
  filterQuery: string;
}) {
  const router = useRouter();
  const years = Array.from({ length: 7 }, (_, i) => year - 3 + i);

  function navigate(nextYear: number, nextMonth: number) {
    const iso = isoDate(new Date(nextYear, nextMonth, 1));
    router.push(`/escalas?view=month&month=${iso}&${filterQuery}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={month}
        onChange={(e) => navigate(year, Number(e.target.value))}
        className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm capitalize dark:border-stone-700 dark:bg-stone-800"
      >
        {MONTH_LABELS.map((label, i) => (
          <option key={i} value={i}>
            {label}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => navigate(Number(e.target.value), month)}
        className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
