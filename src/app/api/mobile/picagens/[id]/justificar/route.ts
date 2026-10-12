import { NextResponse } from "next/server";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { submitJustification } from "@/app/(app)/picagens/actions";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMobileUser(req);
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const justification = typeof body?.justification === "string" ? body.justification.trim() : "";
    if (!justification) {
      return NextResponse.json({ error: "Indique uma justificação." }, { status: 400 });
    }

    const formData = new FormData();
    formData.set("justification", justification);
    await submitJustification(id, formData, user);

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    if (e instanceof Error) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
