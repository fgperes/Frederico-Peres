import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMobileUser(req);
    const { id } = await params;

    await prisma.message.updateMany({
      where: { id, recipientId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
