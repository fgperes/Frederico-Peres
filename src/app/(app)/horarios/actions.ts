"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { shiftDurationHours } from "@/lib/schedule";
import { parseExcelFile } from "@/lib/excel";

const MAX_DAILY_HOURS = 8;

// Código do Trabalho, art.º 203.º — período normal de trabalho diário de,
// em regra, 8 horas.
function assertMaxDailyHours(startTime: string, endTime: string, breakMins: number) {
  const hours = shiftDurationHours(startTime, endTime, breakMins);
  if (hours > MAX_DAILY_HOURS) {
    throw new Error(
      `Este turno tem ${hours.toFixed(1)}h de trabalho — acima do máximo legal de ${MAX_DAILY_HOURS}h/dia (Código do Trabalho, art.º 203.º).`
    );
  }
}

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "horarios")) {
    throw new Error("Sem permissão para editar horários.");
  }
  return user;
}

// Next.js redige (em produção) a mensagem de qualquer erro lançado com
// `throw` que atravesse a fronteira de uma Server Action — mesmo apanhado
// com try/catch no cliente, só chega lá um texto genérico + digest. As
// ações chamadas diretamente do cliente (fora de um <form action> ligado a
// useActionState) devolvem este resultado em vez de lançarem exceções.
type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function safe<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ocorreu um erro." };
  }
}

export async function createShiftTemplate(formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const breakMins = Number(formData.get("breakMins") ?? 0);
  const color = String(formData.get("color") ?? "#2563eb");

  if (!name || !startTime || !endTime) throw new Error("Campos obrigatórios em falta.");
  assertMaxDailyHours(startTime, endTime, breakMins);

  const existing = await prisma.shiftTemplate.findUnique({ where: { name } });
  if (existing) throw new Error(`Já existe um modelo de turno com o nome "${name}".`);

  const template = await prisma.shiftTemplate.create({
    data: { name, startTime, endTime, breakMins, color },
  });

  await logAudit({ userId: user.id, action: "CREATE", entity: "ShiftTemplate", entityId: template.id, details: name });
  revalidatePath("/horarios/modelos");
}

export type CreateShiftTemplateState = { error?: string };

export async function createShiftTemplateAction(
  _prev: CreateShiftTemplateState,
  formData: FormData
): Promise<CreateShiftTemplateState> {
  try {
    await createShiftTemplate(formData);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar o modelo de turno." };
  }
}

export async function updateShiftTemplate(templateId: string, formData: FormData): Promise<ActionResult> {
  return safe(async () => {
    const user = await assertCanWrite();
    const name = String(formData.get("name") ?? "").trim();
    const startTime = String(formData.get("startTime") ?? "");
    const endTime = String(formData.get("endTime") ?? "");
    const breakMins = Number(formData.get("breakMins") ?? 0);
    const color = String(formData.get("color") ?? "#2563eb");

    if (!name || !startTime || !endTime) throw new Error("Campos obrigatórios em falta.");
    assertMaxDailyHours(startTime, endTime, breakMins);

    const existing = await prisma.shiftTemplate.findUnique({ where: { name } });
    if (existing && existing.id !== templateId) {
      throw new Error(`Já existe um modelo de turno com o nome "${name}".`);
    }

    await prisma.shiftTemplate.update({
      where: { id: templateId },
      data: { name, startTime, endTime, breakMins, color },
    });

    await logAudit({ userId: user.id, action: "UPDATE", entity: "ShiftTemplate", entityId: templateId, details: name });
    revalidatePath("/horarios/modelos");
  });
}

export async function deleteShiftTemplate(templateId: string): Promise<ActionResult> {
  return safe(async () => {
    const user = await assertCanWrite();

    const template = await prisma.shiftTemplate.findUniqueOrThrow({
      where: { id: templateId },
      include: { _count: { select: { shifts: true, scheduleCyclePatterns: true } } },
    });
    if (template._count.shifts > 0 || template._count.scheduleCyclePatterns > 0) {
      throw new Error("Só é possível apagar um modelo de turno que não esteja a ser usado em nenhuma escala ou ciclo.");
    }

    await prisma.shiftTemplate.delete({ where: { id: templateId } });
    await logAudit({ userId: user.id, action: "DELETE", entity: "ShiftTemplate", entityId: templateId, details: template.name });
    revalidatePath("/horarios/modelos");
  });
}

export type ImportTemplatesState = {
  error?: string;
  result?: { total: number; created: number; errorReport: string[] };
};

const importTemplateRowSchema = z.object({
  name: z.coerce.string().trim().min(1, "nome em falta"),
  startTime: z.coerce.string().trim().regex(/^\d{2}:\d{2}$/, "início deve ter o formato HH:MM"),
  endTime: z.coerce.string().trim().regex(/^\d{2}:\d{2}$/, "fim deve ter o formato HH:MM"),
  breakMins: z.coerce.number().min(0, "pausa não pode ser negativa").default(0),
  color: z
    .coerce.string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "cor deve ser um código hex (ex.: #2563eb)")
    .default("#2563eb"),
});

// Importação em massa de modelos de turno via Excel, com validação linha a
// linha (incluindo o máximo legal de 8h/dia) e registo em histórico de
// importações, tal como o importador de colaboradores.
export async function importShiftTemplatesAction(
  _prev: ImportTemplatesState,
  formData: FormData
): Promise<ImportTemplatesState> {
  let user;
  try {
    user = await assertCanWrite();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Selecione um ficheiro Excel." };

  let rows: Record<string, unknown>[];
  try {
    rows = await parseExcelFile(file);
  } catch {
    return { error: "Não foi possível ler o ficheiro. Confirme que é um Excel válido (.xlsx)." };
  }

  if (rows.length === 0) return { error: "O ficheiro não contém linhas de dados." };

  const importLog = await prisma.importLog.create({
    data: {
      userId: user.id,
      type: "SHIFT_TEMPLATES",
      fileName: file.name,
      status: "PARTIAL",
      totalRows: rows.length,
    },
  });

  const errorReport: string[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // linha 1 é o cabeçalho
    const parsed = importTemplateRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errorReport.push(`Linha ${rowNum}: ${parsed.error.issues.map((iss) => iss.message).join("; ")}`);
      continue;
    }
    const data = parsed.data;

    const exists = await prisma.shiftTemplate.findUnique({ where: { name: data.name } });
    if (exists) {
      errorReport.push(`Linha ${rowNum}: já existe um modelo de turno com o nome "${data.name}".`);
      continue;
    }

    try {
      assertMaxDailyHours(data.startTime, data.endTime, data.breakMins);
    } catch (e) {
      errorReport.push(`Linha ${rowNum}: ${e instanceof Error ? e.message : "turno acima do máximo legal."}`);
      continue;
    }

    try {
      await prisma.shiftTemplate.create({
        data: {
          name: data.name,
          startTime: data.startTime,
          endTime: data.endTime,
          breakMins: data.breakMins,
          color: data.color,
        },
      });
      created++;
    } catch (e) {
      errorReport.push(`Linha ${rowNum}: erro ao criar registo (${e instanceof Error ? e.message : "desconhecido"}).`);
    }
  }

  await prisma.importLog.update({
    where: { id: importLog.id },
    data: {
      status: errorReport.length === 0 ? "SUCCESS" : created === 0 ? "ERROR" : "PARTIAL",
      errorRows: errorReport.length,
      errorReport: errorReport.length > 0 ? errorReport.join("\n") : null,
    },
  });

  await logAudit({
    userId: user.id,
    action: "IMPORT",
    entity: "ShiftTemplate",
    entityId: importLog.id,
    details: `${created}/${rows.length} modelos de turno importados de ${file.name}`,
  });

  revalidatePath("/horarios/modelos");

  return { result: { total: rows.length, created, errorReport } };
}
