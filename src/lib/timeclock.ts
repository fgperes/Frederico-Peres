import { prisma } from "@/lib/prisma";

export const DEVIATION_THRESHOLD_MINUTES = 10;

export function timeStringToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function classifyDeviation(
  type: "CLOCK_IN" | "CLOCK_OUT",
  timestamp: Date,
  shiftStartTime?: string,
  shiftEndTime?: string
): { hasDeviation: boolean; deviationType: string | null } {
  if (type === "CLOCK_IN" && shiftStartTime) {
    const diff = minutesOfDay(timestamp) - timeStringToMinutes(shiftStartTime);
    if (diff > DEVIATION_THRESHOLD_MINUTES) return { hasDeviation: true, deviationType: "LATE" };
  }
  if (type === "CLOCK_OUT" && shiftEndTime) {
    const diff = timeStringToMinutes(shiftEndTime) - minutesOfDay(timestamp);
    if (diff > DEVIATION_THRESHOLD_MINUTES) return { hasDeviation: true, deviationType: "EARLY_LEAVE" };
    if (diff < -DEVIATION_THRESHOLD_MINUTES) return { hasDeviation: true, deviationType: "OVERTIME" };
  }
  return { hasDeviation: false, deviationType: null };
}

export type PunchType = "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";

// Ponto único de criação de picagens — usado tanto pelo relógio de ponto na
// app (terminalType "WEB") como pelo webhook de terminais físicos, para que
// a deteção de desvios (comparação com o horário planeado) seja sempre a
// mesma, seja qual for a origem da picagem.
export async function recordTimeClockEntry(params: {
  employeeId: string;
  type: PunchType;
  timestamp: Date;
  terminalType: string;
  equipmentId?: string | null;
  coords?: { latitude?: number; longitude?: number; accuracy?: number } | null;
}) {
  const { employeeId, type, timestamp, terminalType, equipmentId, coords } = params;

  const dayStart = new Date(timestamp);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(timestamp);
  dayEnd.setHours(23, 59, 59, 999);

  const shift = await prisma.shift.findFirst({
    where: { employeeId, date: { gte: dayStart, lte: dayEnd } },
  });

  let hasDeviation = false;
  let deviationType: string | null = null;
  if (type === "CLOCK_IN" || type === "CLOCK_OUT") {
    const result = classifyDeviation(type, timestamp, shift?.startTime, shift?.endTime);
    hasDeviation = result.hasDeviation;
    deviationType = result.deviationType;
  }

  return prisma.timeClockEntry.create({
    data: {
      employeeId,
      type,
      timestamp,
      hasDeviation,
      deviationType,
      justificationStatus: hasDeviation ? "PENDING" : null,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      locationAccuracy: coords?.accuracy,
      terminalType,
      equipmentId: equipmentId ?? null,
    },
  });
}
