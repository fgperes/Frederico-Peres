"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canRead, canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateReport } from "@/lib/reports";
import { getDocumentBranding } from "@/lib/document-branding";
import { getMonthStart, getMonthDays, isoDate } from "@/lib/dates";
import type { DocumentBlock } from "@/lib/document-templates";

async function assertCanManage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "relatorios")) {
    throw new Error("Sem permissão para gerir modelos de documentos.");
  }
  return user;
}

export type TemplateFormState = { error?: string };

export async function createDocumentTemplate(formData: FormData): Promise<void> {
  const user = await assertCanManage();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) throw new Error("Indique um nome para o modelo.");

  const template = await prisma.documentTemplate.create({
    data: { name, description: description || null, blocksJson: "[]", createdById: user.id },
  });
  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "DocumentTemplate",
    entityId: template.id,
    details: name,
  });

  revalidatePath("/relatorios/modelos");
  redirect(`/relatorios/modelos/${template.id}`);
}

export async function updateDocumentTemplateMeta(id: string, formData: FormData): Promise<void> {
  const user = await assertCanManage();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) throw new Error("Indique um nome para o modelo.");

  await prisma.documentTemplate.update({
    where: { id },
    data: { name, description: description || null },
  });
  await logAudit({ userId: user.id, action: "UPDATE", entity: "DocumentTemplate", entityId: id, details: name });

  revalidatePath(`/relatorios/modelos/${id}`);
  revalidatePath("/relatorios/modelos");
}

export async function saveDocumentTemplateBlocks(
  id: string,
  blocks: DocumentBlock[]
): Promise<TemplateFormState> {
  try {
    const user = await assertCanManage();
    await prisma.documentTemplate.update({
      where: { id },
      data: { blocksJson: JSON.stringify(blocks) },
    });
    await logAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "DocumentTemplate",
      entityId: id,
      details: `${blocks.length} bloco(s) guardado(s)`,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível guardar o modelo." };
  }

  revalidatePath(`/relatorios/modelos/${id}`);
  return {};
}

export async function deleteDocumentTemplate(id: string): Promise<void> {
  const user = await assertCanManage();
  await prisma.documentTemplate.delete({ where: { id } });
  await logAudit({ userId: user.id, action: "DELETE", entity: "DocumentTemplate", entityId: id });
  revalidatePath("/relatorios/modelos");
}

// ---------------------------------------------------------------------------
// Resolução dos dados de exportação — para cada bloco do modelo, vai buscar
// os dados já existentes (relatório, escala, logótipo) para o período e
// âmbito de colaboradores escolhidos. Nunca calcula nada de novo: só lê o
// que os relatórios/escalas já produzem.
// ---------------------------------------------------------------------------

export type ResolvedBlock =
  | { type: "HEADER_LOGO"; title: string; subtitle: string; clientCompanyName: string | null; clientCompanyLogo: string | null }
  | { type: "TEXT"; text: string }
  | { type: "REPORT_TABLE"; title: string; columns: string[]; rows: (string | number)[][] }
  | { type: "SCHEDULE_GRID"; title: string; dayLabels: string[]; rows: { employeeName: string; employeeNumber: string | null; cells: string[] }[] }
  | { type: "SIGNATURE"; mode: "PER_EMPLOYEE" | "SINGLE"; label: string; employeeNames: string[] };

export type ExportFilters = { month: number; year: number; employeeIds: string[] };

function pdfCellLabel(
  employeeId: string,
  day: Date,
  shifts: { employeeId: string; date: Date; startTime: string; endTime: string }[],
  absences: { employeeId: string; date: Date; label: string }[]
): string {
  const dayIso = isoDate(day);
  const shift = shifts.find((s) => s.employeeId === employeeId && isoDate(s.date) === dayIso);
  if (shift) return `${shift.startTime}-${shift.endTime}`;
  const absence = absences.find((a) => a.employeeId === employeeId && isoDate(a.date) === dayIso);
  if (absence) return absence.label.slice(0, 3).toUpperCase();
  return "F";
}

export async function resolveDocumentTemplateExport(
  templateId: string,
  filters: ExportFilters
): Promise<{ templateName: string; blocks: ResolvedBlock[] } | { error: string }> {
  const user = await requireUser();
  if (!canRead(user.roles, "relatorios")) return { error: "Sem permissão para gerar documentos." };

  const row = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
  if (!row) return { error: "Modelo não encontrado." };
  const blocks = (JSON.parse(row.blocksJson) as DocumentBlock[]) ?? [];

  const scope = await employeeScopeWhere(user);
  const scopedEmployees = await prisma.employee.findMany({
    where: { AND: [scope, { status: "ACTIVE" }] },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  const employees =
    filters.employeeIds.length > 0
      ? scopedEmployees.filter((e) => filters.employeeIds.includes(e.id))
      : scopedEmployees;
  const employeeIds = employees.map((e) => e.id);

  const from = new Date(filters.year, filters.month - 1, 1);
  const to = new Date(filters.year, filters.month, 0, 23, 59, 59, 999);

  const needsSchedule = blocks.some((b) => b.type === "SCHEDULE_GRID");
  const needsBranding = blocks.some((b) => b.type === "HEADER_LOGO");

  const [branding, days, shifts, absences] = await Promise.all([
    needsBranding ? getDocumentBranding() : Promise.resolve(null),
    Promise.resolve(getMonthDays(getMonthStart(isoDate(from)))),
    needsSchedule
      ? prisma.shift.findMany({
          where: { employeeId: { in: employeeIds }, date: { gte: from, lte: to }, status: "PUBLISHED" },
        })
      : Promise.resolve([]),
    needsSchedule
      ? prisma.absence.findMany({
          where: { employeeId: { in: employeeIds }, status: "APPROVED", startDate: { lte: to }, endDate: { gte: from } },
          include: { absenceType: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const absenceEntries = absences.flatMap((a) =>
    days
      .filter((d) => a.startDate <= d && a.endDate >= d)
      .map((d) => ({ employeeId: a.employeeId, date: d, label: a.absenceType.name }))
  );
  const dayLabels = days.map((d) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }));

  const resolved: ResolvedBlock[] = [];
  for (const block of blocks) {
    if (block.type === "HEADER_LOGO") {
      resolved.push({
        type: "HEADER_LOGO",
        title: block.title,
        subtitle: block.subtitle,
        clientCompanyName: branding?.clientCompanyName ?? null,
        clientCompanyLogo: branding?.clientCompanyLogo ?? null,
      });
    } else if (block.type === "TEXT") {
      resolved.push({ type: "TEXT", text: block.text });
    } else if (block.type === "REPORT_TABLE") {
      const report = await generateReport(block.reportKey, { from, to, employeeIds });
      resolved.push({ type: "REPORT_TABLE", title: block.title, columns: report.columns, rows: report.rows });
    } else if (block.type === "SCHEDULE_GRID") {
      resolved.push({
        type: "SCHEDULE_GRID",
        title: block.title,
        dayLabels,
        rows: employees.map((e) => ({
          employeeName: `${e.firstName} ${e.lastName}`,
          employeeNumber: e.employeeNumber,
          cells: days.map((d) => pdfCellLabel(e.id, d, shifts, absenceEntries)),
        })),
      });
    } else if (block.type === "SIGNATURE") {
      resolved.push({
        type: "SIGNATURE",
        mode: block.mode,
        label: block.label,
        employeeNames: block.mode === "PER_EMPLOYEE" ? employees.map((e) => `${e.firstName} ${e.lastName}`) : [],
      });
    }
  }

  return { templateName: row.name, blocks: resolved };
}
