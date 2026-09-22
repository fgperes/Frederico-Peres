"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isSystemAdmin } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { parseExcelFile } from "@/lib/excel";
import { HOLIDAY_SCOPES, type HolidayScope } from "@/lib/holidays";

async function assertAdmin() {
  const user = await requireUser();
  if (!isSystemAdmin(user.roles)) throw new Error("Sem permissão para gerir feriados.");
  return user;
}

export async function createHoliday(formData: FormData) {
  const user = await assertAdmin();

  const dateRaw = String(formData.get("date") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const scope = String(formData.get("scope") ?? "NATIONAL") as HolidayScope;
  const locationIds = formData.getAll("locationIds").map(String).filter(Boolean);

  if (!dateRaw || !description) throw new Error("Data e descrição são obrigatórias.");
  if (!HOLIDAY_SCOPES.includes(scope)) throw new Error("Âmbito inválido.");
  if (scope === "REGIONAL" && locationIds.length === 0) {
    throw new Error("Selecione pelo menos um local de trabalho para um feriado regional.");
  }

  const date = new Date(`${dateRaw}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Data inválida.");

  const existing = await prisma.holiday.findFirst({ where: { date, description } });
  if (existing) throw new Error("Já existe um feriado com esta data e descrição.");

  const holiday = await prisma.holiday.create({
    data: {
      date,
      description,
      scope,
      locations: scope === "REGIONAL" ? { connect: locationIds.map((id) => ({ id })) } : undefined,
    },
  });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "Holiday",
    entityId: holiday.id,
    details: `${description} — ${date.toLocaleDateString("pt-PT")}`,
  });

  revalidatePath("/acessos/feriados");
}

export async function deleteHoliday(holidayId: string) {
  const user = await assertAdmin();
  const holiday = await prisma.holiday.delete({ where: { id: holidayId } });
  await logAudit({
    userId: user.id,
    action: "DELETE",
    entity: "Holiday",
    entityId: holidayId,
    details: holiday.description,
  });
  revalidatePath("/acessos/feriados");
}

export type HolidayImportState = {
  error?: string;
  result?: { total: number; created: number; errorReport: string[] };
};

// Importador Excel de feriados — colunas: date (AAAA-MM-DD), description,
// scope (NATIONAL|REGIONAL), locations (nomes separados por vírgula, só
// relevante para REGIONAL). Ver /api/templates/feriados para o modelo.
export async function importHolidaysAction(
  _prev: HolidayImportState,
  formData: FormData
): Promise<HolidayImportState> {
  const user = await assertAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Selecione um ficheiro Excel." };

  let rows: Record<string, unknown>[];
  try {
    rows = await parseExcelFile(file);
  } catch {
    return { error: "Não foi possível ler o ficheiro. Confirme que é um Excel válido (.xlsx)." };
  }
  if (rows.length === 0) return { error: "O ficheiro não contém linhas de dados." };

  const locations = await prisma.location.findMany();
  const locByName = new Map(locations.map((l) => [l.name.toLowerCase(), l.id]));

  const errorReport: string[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const row = rows[i];
    const dateRaw = String(row.date ?? "").trim();
    const description = String(row.description ?? "").trim();
    const scope = String(row.scope ?? "NATIONAL").trim().toUpperCase();
    const locationsRaw = String(row.locations ?? "").trim();

    if (!dateRaw || !description) {
      errorReport.push(`Linha ${rowNum}: data e descrição são obrigatórias.`);
      continue;
    }
    if (scope !== "NATIONAL" && scope !== "REGIONAL") {
      errorReport.push(`Linha ${rowNum}: scope deve ser NATIONAL ou REGIONAL.`);
      continue;
    }
    const date = new Date(`${dateRaw}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      errorReport.push(`Linha ${rowNum}: data inválida (use AAAA-MM-DD).`);
      continue;
    }

    let locationIds: string[] = [];
    if (scope === "REGIONAL") {
      const names = locationsRaw.split(",").map((s) => s.trim()).filter(Boolean);
      if (names.length === 0) {
        errorReport.push(`Linha ${rowNum}: feriado regional precisa de pelo menos um local (coluna locations).`);
        continue;
      }
      const resolved = names.map((n) => locByName.get(n.toLowerCase()));
      if (resolved.some((id) => !id)) {
        errorReport.push(`Linha ${rowNum}: algum local em "${locationsRaw}" não foi encontrado.`);
        continue;
      }
      locationIds = resolved as string[];
    }

    try {
      await prisma.holiday.create({
        data: {
          date,
          description,
          scope,
          locations: locationIds.length > 0 ? { connect: locationIds.map((id) => ({ id })) } : undefined,
        },
      });
      created++;
    } catch (e) {
      errorReport.push(`Linha ${rowNum}: erro ao importar (${e instanceof Error ? e.message : "desconhecido"}).`);
    }
  }

  await logAudit({
    userId: user.id,
    action: "IMPORT",
    entity: "Holiday",
    details: `${created}/${rows.length} feriados importados de ${file.name}`,
  });

  revalidatePath("/acessos/feriados");
  return { result: { total: rows.length, created, errorReport } };
}
