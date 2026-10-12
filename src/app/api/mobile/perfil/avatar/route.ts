import { NextResponse } from "next/server";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { updateAvatar, uploadAvatarImage, removeAvatarImage } from "@/app/(app)/perfil/actions";

export async function PATCH(req: Request) {
  try {
    const user = await requireMobileUser(req);
    const body = await req.json().catch(() => null);

    if (body?.remove === true) {
      await removeAvatarImage(user);
      return NextResponse.json({ success: true });
    }

    if (typeof body?.avatarKey === "string") {
      await updateAvatar(body.avatarKey, user);
      return NextResponse.json({ success: true });
    }

    if (typeof body?.imageDataUrl === "string") {
      const result = await uploadAvatarImage(body.imageDataUrl, user);
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    if (e instanceof Error) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
