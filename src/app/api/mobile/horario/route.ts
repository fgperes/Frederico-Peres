import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { getWeekStart, getWeekDays, isoDate } from "@/lib/dates";
import { getHolidaysInRange, isHolidayForMunicipality } from "@/lib/holidays";

export async function GET(req: Request) {
  try {
    const user = await requireMobileUser(req);
    if (!user.employeeId) {
      return NextResponse.json({ error: "Conta sem ficha de colaborador associada." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const weekParam = searchParams.get("week") ?? undefined;
    const weekStart = getWeekStart(weekParam);
    const days = getWeekDays(weekStart);
    const rangeStart = days[0];
    const rangeEnd = days[days.length - 1];

    const employee = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      select: { location: { select: { municipality: true } } },
    });

    const [shifts, absences, holidays] = await Promise.all([
      prisma.shift.findMany({
        where: { employeeId: user.employeeId, date: { in: days } },
        include: { shiftTemplate: { select: { name: true, color: true, breakMins: true } } },
        orderBy: { date: "asc" },
      }),
      prisma.absence.findMany({
        where: {
          employeeId: user.employeeId,
          status: "APPROVED",
          startDate: { lte: rangeEnd },
          endDate: { gte: rangeStart },
        },
        include: { absenceType: { select: { name: true, isVacation: true } } },
      }),
      getHolidaysInRange(rangeStart, rangeEnd),
    ]);

    const municipality = employee?.location?.municipality ?? null;
    const holidayByDate = new Map<string, string>();
    for (const h of holidays) {
      if (isHolidayForMunicipality(h, municipality)) holidayByDate.set(isoDate(h.date), h.description);
    }

    const absenceByDate = new Map<string, { label: string; isVacation: boolean }>();
    for (const a of absences) {
      for (const day of days) {
        if (a.startDate <= day && a.endDate >= day) {
          absenceByDate.set(isoDate(day), { label: a.absenceType.name, isVacation: a.absenceType.isVacation });
        }
      }
    }

    const week = days.map((day) => {
      const key = isoDate(day);
      return {
        date: key,
        shifts: shifts
          .filter((s) => isoDate(s.date) === key)
          .map((s) => ({
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
            status: s.status,
            template: s.shiftTemplate ? { name: s.shiftTemplate.name, color: s.shiftTemplate.color } : null,
          })),
        absence: absenceByDate.get(key) ?? null,
        holiday: holidayByDate.get(key) ?? null,
      };
    });

    return NextResponse.json({ weekStart: isoDate(weekStart), week });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
