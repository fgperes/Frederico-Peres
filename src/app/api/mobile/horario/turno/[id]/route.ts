import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMobileUser(req);
    const { id } = await params;

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        shiftTemplate: true,
        employee: { select: { id: true, locationId: true, location: { select: { name: true } } } },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: "Turno não encontrado." }, { status: 404 });
    }
    if (shift.employeeId !== user.employeeId) {
      return NextResponse.json({ error: "Sem permissão para ver este turno." }, { status: 403 });
    }

    let colleagues: { id: string; name: string }[] = [];
    if (shift.shiftTemplateId && shift.employee.locationId) {
      const rows = await prisma.shift.findMany({
        where: {
          date: shift.date,
          shiftTemplateId: shift.shiftTemplateId,
          employeeId: { not: shift.employeeId },
          employee: { locationId: shift.employee.locationId },
        },
        include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      });
      colleagues = rows.map((r) => ({ id: r.employee.id, name: `${r.employee.firstName} ${r.employee.lastName}` }));
    }

    return NextResponse.json({
      id: shift.id,
      date: shift.date.toISOString(),
      startTime: shift.startTime,
      endTime: shift.endTime,
      template: shift.shiftTemplate ? { name: shift.shiftTemplate.name, color: shift.shiftTemplate.color } : null,
      breakStart: shift.shiftTemplate?.breakStart ?? null,
      breakMins: shift.shiftTemplate?.breakMins ?? 0,
      locationName: shift.employee.location?.name ?? null,
      colleagues,
    });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
