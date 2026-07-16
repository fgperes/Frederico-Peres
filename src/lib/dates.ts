import { startOfWeek, addDays, format, parseISO } from "date-fns";

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
