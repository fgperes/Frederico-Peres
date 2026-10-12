import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { requestAbsenceDays } from "@/app/(app)/ausencias/actions";

export async function GET(req: Request) {
  try {
    const user = await requireMobileUser(req);
    if (!user.employeeId) {
      return NextResponse.json({ error: "Conta sem ficha de colaborador associada." }, { status: 404 });
    }

    const [absenceTypes, absences] = await Promise.all([
      prisma.absenceType.findMany({
        where: { isVacation: false },
        orderBy: { name: "asc" },
        select: { id: true, name: true, unitType: true, requiresDocument: true },
      }),
      prisma.absence.findMany({
        where: { employeeId: user.employeeId, absenceType: { isVacation: false } },
        include: { absenceType: { select: { name: true } } },
        orderBy: { startDate: "desc" },
      }),
    ]);

    return NextResponse.json({ absenceTypes, absences });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireMobileUser(req);
    if (!user.employeeId) {
      return NextResponse.json({ error: "Conta sem ficha de colaborador associada." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const absenceTypeId = typeof body?.absenceTypeId === "string" ? body.absenceTypeId : "";
    const dates = Array.isArray(body?.dates) ? body.dates.filter((d: unknown) => typeof d === "string") : [];
    const reason = typeof body?.reason === "string" ? body.reason : undefined;
    const documentName = typeof body?.documentName === "string" ? body.documentName : undefined;
    const documentData = typeof body?.documentData === "string" ? body.documentData : undefined;

    if (!absenceTypeId || dates.length === 0) {
      return NextResponse.json({ error: "Tipo de ausência e pelo menos um dia são obrigatórios." }, { status: 400 });
    }

    const result = await requestAbsenceDays(
      user.employeeId,
      absenceTypeId,
      dates,
      { reason, documentName, documentData },
      user
    );
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
