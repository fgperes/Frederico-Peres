"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import sanitizeHtml from "sanitize-html";

export type CreateNewsState = { error?: string; success?: boolean };

const ALLOWED_TAGS = [
  "b", "strong", "i", "em", "u", "span", "p", "br", "ul", "ol", "li", "a", "h1", "h2", "h3", "div",
];

function sanitizeNewsHtml(rawHtml: string): string {
  return sanitizeHtml(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { span: ["style"], a: ["href", "target", "rel"] },
    allowedStyles: {
      "*": {
        "font-size": [/^\d+(?:px|pt)$/],
        color: [/^#[0-9a-f]{3,6}$/i],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}

export async function createNewsAction(
  _prev: CreateNewsState,
  formData: FormData
): Promise<CreateNewsState> {
  const user = await requireUser();
  if (!user.canPublishNews) {
    return { error: "Não tem permissão para publicar notícias." };
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const rawHtml = String(formData.get("bodyHtml") ?? "");
  const notifyUsers = formData.get("notifyUsers") === "on";
  const targetAll = formData.get("targetAll") === "on";
  const targetRoles = targetAll
    ? []
    : formData
        .getAll("targetRoles")
        .map(String)
        .filter((r) => (ROLES as readonly string[]).includes(r));

  if (!subject) return { error: "O assunto é obrigatório." };
  const plainText = rawHtml.replace(/<[^>]*>/g, "").trim();
  if (!plainText) return { error: "O detalhe da notícia é obrigatório." };
  if (!targetAll && targetRoles.length === 0) {
    return { error: "Selecione \"Todos\" ou pelo menos um perfil destinatário." };
  }

  const bodyHtml = sanitizeNewsHtml(rawHtml);

  const news = await prisma.news.create({
    data: { subject, bodyHtml, notifyUsers, targetRoles, authorId: user.id },
  });

  if (notifyUsers) {
    const recipients = await prisma.user.findMany({
      where: {
        active: true,
        id: { not: user.id },
        ...(targetRoles.length > 0 ? { roles: { some: { role: { in: targetRoles } } } } : {}),
      },
      select: { id: true },
    });
    if (recipients.length > 0) {
      await prisma.task.createMany({
        data: recipients.map((r) => ({
          title: `Nova notícia: ${subject}`,
          type: "NEWS",
          assigneeId: r.id,
        })),
      });
    }
  }

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "News",
    entityId: news.id,
    details: subject,
  });

  revalidatePath("/dashboard");
  return { success: true };
}
