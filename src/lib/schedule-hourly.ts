// Cálculo do efetivo por hora (sub-módulo Execução, em Escalas) — duas
// dimensões para o mesmo dia e filtro de departamento(s)/local(is):
// "Previsto" (a partir dos turnos planeados) e "Real" (a partir das
// picagens). Devolve sempre um array de 24 posições (0h-23h).
import { prisma } from "@/lib/prisma";
import { minutesFromMidnight, shiftEndOffsetMinutes } from "@/lib/schedule";

function dayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function employeeScopeWhere(departmentIds: string[], locationIds: string[]) {
  return {
    ...(departmentIds.length ? { departmentId: { in: departmentIds } } : {}),
    ...(locationIds.length ? { locationId: { in: locationIds } } : {}),
  };
}

// "Previsto": para cada hora, quantos colaboradores têm turno a cobri-la,
// excluindo quem está de pausa de refeição nessa hora (ShiftTemplate.
// breakStart + breakMins — ver nota no schema). Turnos que passam da
// meia-noite só contam nas horas do próprio dia (0h-23h), não no dia
// seguinte — suficiente para a vista diária deste sub-módulo.
export async function computeScheduledHeadcountByHour(
  date: Date,
  departmentIds: string[],
  locationIds: string[]
): Promise<number[]> {
  const { start, end } = dayBounds(date);
  const shifts = await prisma.shift.findMany({
    where: { date: { gte: start, lte: end }, employee: employeeScopeWhere(departmentIds, locationIds) },
    include: { shiftTemplate: { select: { breakStart: true, breakMins: true } } },
  });

  const counts = new Array(24).fill(0);
  for (const shift of shifts) {
    const startMin = minutesFromMidnight(shift.startTime);
    const endMin = shiftEndOffsetMinutes(shift.startTime, shift.endTime);

    let breakStartMin: number | null = null;
    let breakEndMin: number | null = null;
    const breakStart = shift.shiftTemplate?.breakStart;
    const breakMins = shift.shiftTemplate?.breakMins ?? 0;
    if (breakStart && breakMins > 0) {
      breakStartMin = minutesFromMidnight(breakStart);
      if (breakStartMin < startMin) breakStartMin += 24 * 60; // pausa já no dia seguinte do turno
      breakEndMin = breakStartMin + breakMins;
    }

    for (let h = 0; h < 24; h++) {
      const hourStart = h * 60;
      const hourEnd = hourStart + 60;
      if (startMin >= hourEnd || endMin <= hourStart) continue; // turno não cobre esta hora
      const onBreak = breakStartMin !== null && breakEndMin !== null && breakStartMin < hourEnd && breakEndMin > hourStart;
      if (!onBreak) counts[h]++;
    }
  }
  return counts;
}

type ClockEntry = { employeeId: string; type: string; timestamp: Date };

// Reconstrói os intervalos "a trabalhar" de um colaborador a partir das
// picagens do dia — CLOCK_IN/CLOCK_OUT com BREAK_START/BREAK_END a
// interromper o intervalo. Picagem sem CLOCK_OUT (dia em curso) conta
// como a trabalhar até agora.
function buildWorkIntervals(entries: ClockEntry[]): { start: Date; end: Date }[] {
  const sorted = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const intervals: { start: Date; end: Date }[] = [];
  let workingSince: Date | null = null;

  for (const e of sorted) {
    if (e.type === "CLOCK_IN") {
      workingSince = e.timestamp;
    } else if (e.type === "BREAK_START" && workingSince) {
      intervals.push({ start: workingSince, end: e.timestamp });
      workingSince = null;
    } else if (e.type === "BREAK_END") {
      workingSince = e.timestamp;
    } else if (e.type === "CLOCK_OUT" && workingSince) {
      intervals.push({ start: workingSince, end: e.timestamp });
      workingSince = null;
    }
  }
  if (workingSince) intervals.push({ start: workingSince, end: new Date() });
  return intervals;
}

// "Real": para cada hora, quantos colaboradores estiveram efetivamente a
// trabalhar (picados, fora de pausa), com base em TimeClockEntry.
export async function computeActualHeadcountByHour(
  date: Date,
  departmentIds: string[],
  locationIds: string[]
): Promise<number[]> {
  const { start, end } = dayBounds(date);
  const entries = await prisma.timeClockEntry.findMany({
    where: { timestamp: { gte: start, lte: end }, employee: employeeScopeWhere(departmentIds, locationIds) },
    select: { employeeId: true, type: true, timestamp: true },
  });

  const byEmployee = new Map<string, ClockEntry[]>();
  for (const e of entries) {
    const arr = byEmployee.get(e.employeeId) ?? [];
    arr.push(e);
    byEmployee.set(e.employeeId, arr);
  }

  const counts = new Array(24).fill(0);
  for (const empEntries of byEmployee.values()) {
    const intervals = buildWorkIntervals(empEntries);
    for (let h = 0; h < 24; h++) {
      const hourStart = new Date(start);
      hourStart.setHours(h, 0, 0, 0);
      const hourEnd = new Date(start);
      hourEnd.setHours(h + 1, 0, 0, 0);
      const worked = intervals.some((iv) => iv.start < hourEnd && iv.end > hourStart);
      if (worked) counts[h]++;
    }
  }
  return counts;
}
