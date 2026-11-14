import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { getAllowedRecipients, canMessageRecipient } from "@/lib/messaging";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const user = await requireMobileUser(req);

    const [recipients, messages] = await Promise.all([
      getAllowedRecipients(user),
      prisma.message.findMany({
        where: { recipientId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          readAt: true,
          sender: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({ recipients, messages });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireMobileUser(req);

    const body = await req.json().catch(() => null);
    const recipientId = typeof body?.recipientId === "string" ? body.recipientId : "";
    const text = typeof body?.body === "string" ? body.body.trim() : "";

    if (!recipientId) return NextResponse.json({ error: "Selecione um destinatário." }, { status: 400 });
    if (!text) return NextResponse.json({ error: "Escreva uma mensagem." }, { status: 400 });
    if (text.length > 1000) {
      return NextResponse.json({ error: "Mensagem demasiado longa (máx. 1000 caracteres)." }, { status: 400 });
    }

    const allowed = await canMessageRecipient(user, recipientId);
    if (!allowed) {
      return NextResponse.json({ error: "Não tem permissão para enviar mensagens a este destinatário." }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: { senderId: user.id, recipientId, body: text },
    });

    await logAudit({
      userId: user.id,
      action: "SEND_MESSAGE",
      entity: "Message",
      entityId: message.id,
      details: `Para ${recipientId}`,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
