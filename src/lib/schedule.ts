// Cálculos partilhados de duração de turnos, usados no motor de ciclos de
// horário (src/app/(app)/horarios/ciclos/actions.ts) e nos relatórios de
// escalas (src/lib/reports.ts).

export function shiftDurationHours(startTime: string, endTime: string, breakMins: number): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0) minutes += 24 * 60; // turno passa a meia-noite
  return Math.max(0, (minutes - breakMins) / 60);
}

export function minutesFromMidnight(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Fim do turno em minutos desde a meia-noite do dia em que começa (pode
// ultrapassar 1440 para turnos que passam a meia-noite).
export function shiftEndOffsetMinutes(startTime: string, endTime: string): number {
  const start = minutesFromMidnight(startTime);
  let end = minutesFromMidnight(endTime);
  if (end <= start) end += 24 * 60;
  return end;
}
