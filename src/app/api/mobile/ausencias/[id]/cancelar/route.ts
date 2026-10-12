import { NextResponse } from "next/server";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { cancelAbsence } from "@/app/(app)/ausencias/actions";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMobileUser(req);
    const { id } = await params;

    const result = await cancelAbsence(id, user);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
