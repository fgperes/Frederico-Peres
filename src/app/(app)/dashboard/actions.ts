"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isSystemAdmin } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { getModuleSubscription } from "@/lib/subscriptions";
import type { AnniversaryKind } from "@/lib/anniversaries";
import { revalidatePath } from "next/cache";

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function safe<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ocorreu um erro." };
  }
}

const VALID_KINDS: AnniversaryKind[] = ["BIRTHDAY", "WORK_ANNIVERSARY"];

function assertValidKind(kind: string): asserts kind is AnniversaryKind {
  if (!VALID_KINDS.includes(kind as AnniversaryKind)) {
    throw new Error("Tipo de aniversário inválido.");
  }
}

// Deixa (ou substitui, se já tinha deixado este ano) uma mensagem de
// parabéns a um colega. Um colega só vê que "já deixou mensagem" — nunca as
// mensagens de outros, nem as suas próprias depois de enviadas (ver
// getMyAnniversaryMessages, restrito ao próprio homenageado).
export async function postAnniversaryComment(
  employeeId: string,
  kind: string,
  body: string
): Promise<ActionResult<void>> {
  return safe(async () => {
    const user = await requireUser();
    assertValidKind(kind);

    const trimmed = body.trim();
    if (!trimmed) throw new Error("Escreva uma mensagem.");
    if (trimmed.length > 500) throw new Error("Mensagem demasiado longa (máx. 500 caracteres).");

    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!employee) throw new Error("Colaborador não encontrado.");

    const year = new Date().getFullYear();

    await prisma.anniversaryComment.upsert({
      where: { employeeId_authorId_kind_year: { employeeId, authorId: user.id, kind, year } },
      create: { employeeId, authorId: user.id, kind, year, body: trimmed },
      update: { body: trimmed },
    });

    await logAudit({
      userId: user.id,
      action: "CREATE",
      entity: "AnniversaryComment",
      details: `Mensagem de ${kind === "BIRTHDAY" ? "aniversário" : "aniversário de entrada"} deixada para colaborador ${employeeId}`,
    });

    revalidatePath("/dashboard");
  });
}

export type AnniversaryMessage = { id: string; authorName: string; body: string; createdAt: Date };
export type AnniversaryMessagesResult = { years: number[]; selectedYear: number | null; messages: AnniversaryMessage[] };

// Só o próprio colaborador homenageado pode ver as mensagens que recebeu —
// qualquer outro pedido (incluindo de quem escreveu uma mensagem) é
// recusado. year omitido devolve o ano mais recente com mensagens.
export async function getMyAnniversaryMessages(
  employeeId: string,
  kind: string,
  year?: number
): Promise<ActionResult<AnniversaryMessagesResult>> {
  return safe(async () => {
    const user = await requireUser();
    assertValidKind(kind);

    if (!user.employeeId || user.employeeId !== employeeId) {
      throw new Error("Só pode ver as mensagens que lhe foram deixadas a si.");
    }

    const allForKind = await prisma.anniversaryComment.findMany({
      where: { employeeId, kind },
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
    });
    const years = allForKind.map((r) => r.year);
    const selectedYear = year ?? years[0] ?? null;

    if (selectedYear === null) {
      return { years, selectedYear: null, messages: [] };
    }

    const comments = await prisma.anniversaryComment.findMany({
      where: { employeeId, kind, year: selectedYear },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return {
      years,
      selectedYear,
      messages: comments.map((c) => ({ id: c.id, authorName: c.author.name, body: c.body, createdAt: c.createdAt })),
    };
  });
}

// Liga/desliga a dinâmica de aniversários de entrada (não afeta os
// aniversários de nascimento) — mesmo padrão do módulo preditivo.
export async function setWorkAnniversaryEnabled(enabled: boolean): Promise<ActionResult<void>> {
  return safe(async () => {
    const user = await requireUser();
    if (!isSystemAdmin(user.roles)) {
      throw new Error("Só o Administrador do Sistema pode ativar/desativar esta funcionalidade.");
    }

    const settings = await getModuleSubscription();
    await prisma.moduleSubscription.update({
      where: { id: settings.id },
      data: { workAnniversaryEnabled: enabled, updatedById: user.id },
    });

    await logAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "ModuleSubscription",
      entityId: settings.id,
      details: `Aniversários de entrada: ${enabled ? "ativados" : "desativados"}`,
    });

    revalidatePath("/dashboard");
  });
}
