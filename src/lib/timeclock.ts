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
