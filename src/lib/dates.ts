import {
  startOfWeek,
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

// Todos os dias do mês (1 a 28-31), sem preenchimento de semanas —
// usada na tabela de escalas mensal (colaboradores em linha, dias em
// coluna, tal como a vista semanal mas com o mês inteiro).
export function getMonthDays(monthStart: Date): Date[] {
  return eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) });
}

export function addMonthsIso(dateStr: string, months: number): string {
  return isoDate(addMonths(parseISO(dateStr), months));
}
