import { prisma } from "@/lib/prisma";
import { getUpcomingAbsences } from "@/lib/anniversaries";
import type { requireUser } from "@/lib/session";

export async function loadColaboradorDashboardData(user: Awaited<ReturnType<typeof requireUser>>) {
  if (!user.employeeId) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();

  const [nextShift, feriasBalance, pendingAbsences, unjustifiedDeviations, upcomingAbsences] = await Promise.all([
    prisma.shift.findFirst({
      where: { employeeId: user.employeeId, date: { gte: today }, status: "PUBLISHED" },
      orderBy: { date: "asc" },
      include: { shiftTemplate: true },
    }),
    prisma.absenceBalance.findFirst({
      where: { employeeId: user.employeeId, year, absenceType: { name: "Férias" } },
    }),
    prisma.absence.count({ where: { employeeId: user.employeeId, status: "PENDING" } }),
    prisma.timeClockEntry.count({
      where: { employeeId: user.employeeId, hasDeviation: true, justification: null },
    }),
    // Âmbito "própria ficha" — mostra ambos os tipos (ausências e férias).
    getUpcomingAbsences({ id: user.employeeId }),
  ]);

  const feriasDisponiveis = feriasBalance
    ? feriasBalance.entitledDays - feriasBalance.usedDays - feriasBalance.plannedDays
    : null;

  return { nextShift, feriasDisponiveis, pendingAbsences, unjustifiedDeviations, upcomingAbsences };
}
