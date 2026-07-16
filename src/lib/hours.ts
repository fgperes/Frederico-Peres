import { isoDate } from "@/lib/dates";

type Entry = { type: string; timestamp: Date };

// PI-05: cálculo simplificado de horas trabalhadas a partir de pares
// entrada/saída (e pausa/fim de pausa), por dia.
export function computeWorkedHours(entries: Entry[]): number {
  const sorted = [...entries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  let totalMs = 0;
  let clockInAt: Date | null = null;
  let breakStartAt: Date | null = null;
  let breakMs = 0;

  for (const e of sorted) {
    if (e.type === "CLOCK_IN") clockInAt = e.timestamp;
    if (e.type === "BREAK_START") breakStartAt = e.timestamp;
    if (e.type === "BREAK_END" && breakStartAt) {
      breakMs += e.timestamp.getTime() - breakStartAt.getTime();
      breakStartAt = null;
    }
    if (e.type === "CLOCK_OUT" && clockInAt) {
      totalMs += e.timestamp.getTime() - clockInAt.getTime() - breakMs;
      clockInAt = null;
      breakMs = 0;
    }
  }

  return Math.max(0, totalMs / (1000 * 60 * 60));
}

// Como computeWorkedHours, mas agrupado por dia civil (data do CLOCK_IN) —
// usado pelo motor de payroll para calcular horas extra dia a dia.
export function computeWorkedHoursByDay(entries: Entry[]): Map<string, number> {
  const sorted = [...entries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const byDay = new Map<string, number>();
  let clockInAt: Date | null = null;
  let clockInDay: string | null = null;
  let breakStartAt: Date | null = null;
  let breakMs = 0;

  for (const e of sorted) {
    if (e.type === "CLOCK_IN") {
      clockInAt = e.timestamp;
      clockInDay = isoDate(e.timestamp);
    }
    if (e.type === "BREAK_START") breakStartAt = e.timestamp;
    if (e.type === "BREAK_END" && breakStartAt) {
      breakMs += e.timestamp.getTime() - breakStartAt.getTime();
      breakStartAt = null;
    }
    if (e.type === "CLOCK_OUT" && clockInAt && clockInDay) {
      const hours = Math.max(
        0,
        (e.timestamp.getTime() - clockInAt.getTime() - breakMs) / (1000 * 60 * 60)
      );
      byDay.set(clockInDay, (byDay.get(clockInDay) ?? 0) + hours);
      clockInAt = null;
      clockInDay = null;
      breakMs = 0;
    }
  }

  return byDay;
}
