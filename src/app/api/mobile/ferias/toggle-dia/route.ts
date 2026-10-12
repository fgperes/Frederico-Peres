import { NextResponse } from "next/server";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { toggleVacationDays } from "@/app/(app)/ferias/actions";

export async function POST(req: Request) {
  try {
    const user = await requireMobileUser(req);
    if (!user.employeeId) {
      return NextResponse.json({ error: "Conta sem ficha de colaborador associada." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const dates = Array.isArray(body?.dates) ? body.dates.filter((d: unknown) => typeof d === "string") : [];
    if (dates.length === 0) {
      return NextResponse.json({ error: "Selecione pelo menos um dia." }, { status: 400 });
    }

    const result = await toggleVacationDays(user.employeeId, dates, user);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ success: true, updated: result.updated ?? 0, failed: result.failed ?? [] });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
