import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { isoDate } from "./dates";
import { DEFAULT_CAPACITY_PER_EMPLOYEE, WINDOWS } from "./schedule-generation";

export type CoverageDay = { dateIso: string; scheduled: number; recommended: number | null };

// Estimativa de cobertura por dia — nº de colaboradores agendados nesse
// dia vs a necessidade prevista — lendo o mesmo histórico de procura do
// módulo Preditivo (não o substitui nem o altera), só para dar um sinal
// visual rápido na grelha de Escalas. Só é possível quando os
// colaboradores visíveis pertencem a um único departamento filtrado — a
// procura é guardada por departamento, não faz sentido somar entre vários.
export async function computeCoverage(
  days: Date[],
  departmentId: string | null | undefined,
  shiftsByDay: Map<string, number>
): Promise<CoverageDay[] | null> {
  if (!departmentId || days.length === 0) return null;

  const lookbackStart = addDays(days[0], -8 * 7);
  const history = await prisma.demandForecast.findMany({
    where: { departmentId, date: { gte: lookbackStart, lt: days[0] } },
  });
  if (history.length === 0) return null;

  return days.map((day) => {
    const dow = day.getDay();
    const sameWeekdayHistory = history.filter((h) => h.date.getDay() === dow);

    let recommended = 0;
    let hasAnyData = false;
    for (const win of WINDOWS) {
      const relevantHours = sameWeekdayHistory.filter((h) => {
        const hour = h.hour < win.startHour && win.endHour > 24 ? h.hour + 24 : h.hour;
        return hour >= win.startHour && hour < win.endHour;
      });
      if (relevantHours.length === 0) continue;
      hasAnyData = true;
      const avgDemand = relevantHours.reduce((sum, h) => sum + h.demandValue, 0) / relevantHours.length;
      if (avgDemand > 0) recommended += Math.max(1, Math.ceil(avgDemand / DEFAULT_CAPACITY_PER_EMPLOYEE));
    }

    const dateIso = isoDate(day);
    return {
      dateIso,
      scheduled: shiftsByDay.get(dateIso) ?? 0,
      recommended: hasAnyData ? recommended : null,
    };
  });
}
