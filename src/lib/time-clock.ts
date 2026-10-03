import { prisma } from "@/lib/prisma";
import { computeWorkedHoursByDay } from "@/lib/hours";
import { shiftDurationHours } from "@/lib/schedule";
import { isoDate } from "@/lib/dates";

export type DayClockTimes = {
  clockIn: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  clockOut: string | null;
};

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

// Horário real de um dia a partir das picagens — entrada, saída/entrada de
// almoço (só quando há pausa registada) e saída. Usado na coluna
// "Real (picagens)" em vez de só o total de horas.
export function getDayClockTimes(entries: { type: string; timestamp: Date }[]): DayClockTimes {
  const sorted = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const clockIn = sorted.find((e) => e.type === "CLOCK_IN") ?? null;
  const breakStart = sorted.find((e) => e.type === "BREAK_START") ?? null;
  const breakEnd = sorted.find((e) => e.type === "BREAK_END") ?? null;
  const clockOuts = sorted.filter((e) => e.type === "CLOCK_OUT");
  const clockOut = clockOuts.length > 0 ? clockOuts[clockOuts.length - 1] : null;
  return {
    clockIn: clockIn ? fmtTime(clockIn.timestamp) : null,
    breakStart: breakStart ? fmtTime(breakStart.timestamp) : null,
    breakEnd: breakEnd ? fmtTime(breakEnd.timestamp) : null,
    clockOut: clockOut ? fmtTime(clockOut.timestamp) : null,
  };
}

// Recalcula, no servidor, o desvio (real - previsto, em minutos) de um
// colaborador num dia — exatamente a mesma conta que a grelha de execução
// mostra (inclui correções manuais já aplicadas a cada lado). Usado para
// tirar um "retrato" fiável no momento de uma decisão do gestor de RH
// (TimeClockDayDecision.diffMinutes), sem confiar em valores vindos do
// cliente.
export async function computeDayDiffMinutes(employeeId: string, dateIso: string): Promise<number> {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateIso}T23:59:59.999Z`);

  const [shift, entries, corrections] = await Promise.all([
    prisma.shift.findFirst({
      where: { employeeId, date, status: "PUBLISHED" },
      include: { shiftTemplate: true },
    }),
    prisma.timeClockEntry.findMany({
      where: { employeeId, timestamp: { gte: date, lte: dayEnd } },
    }),
    prisma.hoursCorrection.findMany({ where: { employeeId, date } }),
  ]);

  const scheduledRaw = shift
    ? shiftDurationHours(shift.startTime, shift.endTime, shift.shiftTemplate?.breakMins ?? 0)
    : 0;
  const actualRaw = computeWorkedHoursByDay(entries).get(isoDate(date)) ?? 0;

  const scheduledCorrMin = corrections.find((c) => c.field === "SCHEDULED")?.minutesDelta ?? 0;
  const actualCorrMin = corrections.find((c) => c.field === "ACTUAL")?.minutesDelta ?? 0;

  const scheduledCorrected = scheduledRaw + scheduledCorrMin / 60;
  const actualCorrected = actualRaw + actualCorrMin / 60;

  return Math.round((actualCorrected - scheduledCorrected) * 60);
}
