export function countDays(
  start: Date,
  end: Date,
  unitType: "WORKING_DAYS" | "CALENDAR_DAYS" | string
): number {
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);

  if (unitType === "CALENDAR_DAYS") {
    return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  let count = 0;
  const cursor = new Date(s);
  while (cursor <= e) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}
