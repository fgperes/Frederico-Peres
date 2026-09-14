import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  addMonths,
  format,
  parseISO,
} from "date-fns";

export function getWeekStart(dateParam?: string): Date {
  const base = dateParam ? parseISO(dateParam) : new Date();
  return startOfWeek(base, { weekStartsOn: 1 });
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function isoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export const WEEKDAY_LABELS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

export function addWeeksIso(dateStr: string, weeks: number): string {
  const d = addDays(parseISO(dateStr), weeks * 7);
  return isoDate(d);
}

export function getMonthStart(dateParam?: string): Date {
  const base = dateParam ? parseISO(dateParam) : new Date();
  return startOfMonth(base);
}

// Grelha completa do mês (semanas inteiras, começando à segunda-feira) —
// inclui dias do mês anterior/seguinte que preencham a primeira/última
// semana, tal como um calendário normal.
export function getMonthGridDays(monthStart: Date): Date[] {
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function addMonthsIso(dateStr: string, months: number): string {
  return isoDate(addMonths(parseISO(dateStr), months));
}
