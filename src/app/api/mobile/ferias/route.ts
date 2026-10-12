import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import {
  getOrCreateVacationBalance,
  computeHeadcount,
  effectiveStatus,
  toDateKey,
  getVacationHistory,
  getHolidayDatesForMunicipality,
} from "@/lib/vacation";

export async function GET(req: Request) {
  try {
    const user = await requireMobileUser(req);
    if (!user.employeeId) {
      return NextResponse.json({ error: "Conta sem ficha de colaborador associada." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    const { type, balance } = await getOrCreateVacationBalance(user.employeeId, year);
    const headcount = computeHeadcount(balance);
    const history = await getVacationHistory(user.employeeId);
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: user.employeeId },
      select: { location: { select: { municipality: true } } },
    });

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const [absences, holidayDates] = await Promise.all([
      prisma.absence.findMany({
        where: {
          employeeId: user.employeeId,
          absenceTypeId: type.id,
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { gte: yearStart, lte: yearEnd },
        },
      }),
      getHolidayDatesForMunicipality(yearStart, yearEnd, employee.location?.municipality ?? null),
    ]);

    const marks: Record<string, { status: string }> = {};
    for (const a of absences) {
      marks[toDateKey(a.startDate)] = { status: effectiveStatus(a) };
    }

    return NextResponse.json({
      year,
      headcount,
      planned: balance.plannedDays,
      marks,
      holidayDates: Object.fromEntries(holidayDates),
      history,
    });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
