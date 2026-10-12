import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { getTodayMealStatus } from "@/lib/meal-rules";
import { clockAction, type GeoCoords } from "@/app/(app)/picagens/actions";

export async function GET(req: Request) {
  try {
    const user = await requireMobileUser(req);
    if (!user.employeeId) {
      return NextResponse.json({ error: "Conta sem ficha de colaborador associada." }, { status: 404 });
    }

    const [entries, employee] = await Promise.all([
      prisma.timeClockEntry.findMany({
        where: { employeeId: user.employeeId },
        orderBy: { timestamp: "desc" },
        take: 15,
      }),
      prisma.employee.findUnique({ where: { id: user.employeeId }, select: { weeklyHours: true } }),
    ]);
    const mealStatus = await getTodayMealStatus(user.employeeId, employee?.weeklyHours ?? 40);

    return NextResponse.json({ entries, mealStatus });
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
    const type = body?.type;
    if (!["CLOCK_IN", "CLOCK_OUT", "BREAK_START", "BREAK_END"].includes(type)) {
      return NextResponse.json({ error: "Tipo de picagem inválido." }, { status: 400 });
    }
    const coords: GeoCoords | null =
      typeof body?.latitude === "number" && typeof body?.longitude === "number"
        ? { latitude: body.latitude, longitude: body.longitude, accuracy: typeof body.accuracy === "number" ? body.accuracy : undefined }
        : null;

    await clockAction(type, coords, "MOBILE", user);

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    if (e instanceof Error) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
