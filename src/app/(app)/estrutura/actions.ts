"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { OPERATING_HOURS_DAY_LABELS } from "./operating-hours-constants";

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "recursos")) {
    throw new Error("Sem permissão para editar a estrutura organizacional.");
  }
  return user;
}

function refreshEstrutura() {
  revalidatePath("/estrutura");
  revalidatePath("/estrutura/organograma");
}

export async function createDepartment(formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || null;
  if (!name) throw new Error("Nome obrigatório.");

  const dept = await prisma.department.create({ data: { name, parentId } });
  await logAudit({ userId: user.id, action: "CREATE", entity: "Department", entityId: dept.id, details: name });
  refreshEstrutura();
}

export async function updateDepartment(departmentId: string, formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || null;
  if (!name) throw new Error("Nome obrigatório.");
  if (parentId === departmentId) throw new Error("Um departamento não pode ser o seu próprio departamento-mãe.");

  await prisma.department.update({ where: { id: departmentId }, data: { name, parentId } });
  await logAudit({ userId: user.id, action: "UPDATE", entity: "Department", entityId: departmentId, details: name });
  refreshEstrutura();
  revalidatePath(`/estrutura/departamentos/${departmentId}`);
}

export async function deleteDepartment(departmentId: string): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();

    const dept = await prisma.department.findUniqueOrThrow({
      where: { id: departmentId },
      include: { _count: { select: { employees: true, teams: true, children: true } } },
    });
    if (dept._count.employees > 0 || dept._count.teams > 0 || dept._count.children > 0) {
      throw new Error("Só é possível apagar um departamento vazio (sem colaboradores, equipas ou sub-departamentos).");
    }

    await prisma.department.delete({ where: { id: departmentId } });
    await logAudit({ userId: user.id, action: "DELETE", entity: "Department", entityId: departmentId, details: dept.name });
    refreshEstrutura();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível apagar o departamento." };
  }
}

export async function createTeam(formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const departmentId = String(formData.get("departmentId") ?? "");
  if (!name || !departmentId) throw new Error("Nome e departamento obrigatórios.");

  const team = await prisma.team.create({ data: { name, departmentId } });
  await logAudit({ userId: user.id, action: "CREATE", entity: "Team", entityId: team.id, details: name });
  refreshEstrutura();
}

export async function updateTeam(teamId: string, formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const departmentId = String(formData.get("departmentId") ?? "");
  if (!name || !departmentId) throw new Error("Nome e departamento obrigatórios.");

  await prisma.team.update({ where: { id: teamId }, data: { name, departmentId } });
  await logAudit({ userId: user.id, action: "UPDATE", entity: "Team", entityId: teamId, details: name });
  refreshEstrutura();
  revalidatePath(`/estrutura/equipas/${teamId}`);
}

export async function deleteTeam(teamId: string): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();

    const team = await prisma.team.findUniqueOrThrow({
      where: { id: teamId },
      include: { _count: { select: { employees: true } } },
    });
    if (team._count.employees > 0) {
      throw new Error("Só é possível apagar uma equipa vazia (sem colaboradores).");
    }

    await prisma.team.delete({ where: { id: teamId } });
    await logAudit({ userId: user.id, action: "DELETE", entity: "Team", entityId: teamId, details: team.name });
    refreshEstrutura();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível apagar a equipa." };
  }
}

export async function createLocation(formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const district = String(formData.get("district") ?? "").trim() || null;
  const municipality = String(formData.get("municipality") ?? "").trim() || null;
  const postalCode = String(formData.get("postalCode") ?? "").trim() || null;
  if (!name) throw new Error("Nome obrigatório.");

  const location = await prisma.location.create({
    data: { name, address, district, municipality, postalCode },
  });
  await logAudit({ userId: user.id, action: "CREATE", entity: "Location", entityId: location.id, details: name });
  refreshEstrutura();
}

export async function updateLocation(locationId: string, formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const district = String(formData.get("district") ?? "").trim() || null;
  const municipality = String(formData.get("municipality") ?? "").trim() || null;
  const postalCode = String(formData.get("postalCode") ?? "").trim() || null;
  if (!name) throw new Error("Nome obrigatório.");

  await prisma.location.update({
    where: { id: locationId },
    data: { name, address, district, municipality, postalCode },
  });
  await logAudit({ userId: user.id, action: "UPDATE", entity: "Location", entityId: locationId, details: name });
  refreshEstrutura();
  revalidatePath(`/estrutura/locais/${locationId}`);
}

export async function deleteLocation(locationId: string): Promise<{ error?: string }> {
  try {
    const user = await assertCanWrite();

    const location = await prisma.location.findUniqueOrThrow({
      where: { id: locationId },
      include: { _count: { select: { employees: true } } },
    });
    if (location._count.employees > 0) {
      throw new Error("Só é possível apagar um local vazio (sem colaboradores).");
    }

    await prisma.location.delete({ where: { id: locationId } });
    await logAudit({ userId: user.id, action: "DELETE", entity: "Location", entityId: locationId, details: location.name });
    refreshEstrutura();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível apagar o local." };
  }
}

// Horário de funcionamento (0=Domingo..6=Sábado) — oito linhas por
// departamento/local: uma por dia da semana mais uma para feriados
// (dayOfWeek nulo, isHoliday=true, aplica-se a qualquer feriado em
// Holiday). Usado pela geração de escalas para nunca propor turnos fora
// do horário em que o departamento/local está aberto.
export type OperatingHoursRowInput = {
  dayOfWeek: number | null; // null só na linha de feriados
  isHoliday: boolean;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

function parseOperatingHoursRows(formData: FormData): OperatingHoursRowInput[] {
  const rows: OperatingHoursRowInput[] = [];
  for (let dow = 0; dow <= 6; dow++) {
    rows.push({
      dayOfWeek: dow,
      isHoliday: false,
      isClosed: formData.get(`closed_${dow}`) === "on",
      openTime: String(formData.get(`open_${dow}`) ?? "").trim() || null,
      closeTime: String(formData.get(`close_${dow}`) ?? "").trim() || null,
    });
  }
  rows.push({
    dayOfWeek: null,
    isHoliday: true,
    isClosed: formData.get("closed_holiday") === "on",
    openTime: String(formData.get("open_holiday") ?? "").trim() || null,
    closeTime: String(formData.get("close_holiday") ?? "").trim() || null,
  });
  return rows;
}

function validateOperatingHoursRows(rows: OperatingHoursRowInput[]) {
  for (const row of rows) {
    if (row.isClosed) continue;
    if (!row.openTime || !row.closeTime) {
      const label = row.isHoliday ? "Feriados" : OPERATING_HOURS_DAY_LABELS[row.dayOfWeek!];
      throw new Error(`${label}: defina a hora de abertura e de fecho, ou marque como encerrado.`);
    }
  }
}

// Como dayOfWeek é nulo na linha de feriados, não dá para usar o acessor
// composto gerado pelo Prisma para o @@unique (NULL nunca é igual a NULL
// em SQL, por isso o Prisma nem gera um tipo que aceite null aí) — em vez
// de upsert por chave composta, procura-se a linha manualmente e
// cria-se/atualiza-se consoante exista ou não.
async function upsertOperatingHoursRow(
  scope: { departmentId: string } | { locationId: string },
  row: OperatingHoursRowInput
) {
  const existing = await prisma.operatingHours.findFirst({
    where: { ...scope, dayOfWeek: row.dayOfWeek, isHoliday: row.isHoliday },
    select: { id: true },
  });
  if (existing) {
    await prisma.operatingHours.update({
      where: { id: existing.id },
      data: { isClosed: row.isClosed, openTime: row.openTime, closeTime: row.closeTime },
    });
  } else {
    await prisma.operatingHours.create({ data: { ...scope, ...row } });
  }
}

export async function saveDepartmentOperatingHours(departmentId: string, formData: FormData) {
  await assertCanWrite();
  const rows = parseOperatingHoursRows(formData);
  validateOperatingHoursRows(rows);

  for (const row of rows) {
    await upsertOperatingHoursRow({ departmentId }, row);
  }
  revalidatePath(`/estrutura/departamentos/${departmentId}`);
}

export async function saveLocationOperatingHours(locationId: string, formData: FormData) {
  await assertCanWrite();
  const rows = parseOperatingHoursRows(formData);
  validateOperatingHoursRows(rows);

  for (const row of rows) {
    await upsertOperatingHoursRow({ locationId }, row);
  }
  revalidatePath(`/estrutura/locais/${locationId}`);
}

export type MigrateField = "departmentId" | "teamId" | "locationId";

// Move um colaborador para outro departamento/equipa/local — usado nos
// botões "Migrar" das páginas de detalhe de cada secção.
export async function migrateEmployeeSection(
  employeeId: string,
  field: MigrateField,
  value: string
) {
  const user = await assertCanWrite();
  const employee = await prisma.employee.update({
    where: { id: employeeId },
    data: { [field]: value || null },
  });

  const labels: Record<MigrateField, string> = {
    departmentId: "departamento",
    teamId: "equipa",
    locationId: "local de trabalho",
  };

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "Employee",
    entityId: employee.id,
    details: `Migrado de ${labels[field]} — ${employee.firstName} ${employee.lastName}`,
  });

  refreshEstrutura();
  revalidatePath("/colaboradores");
  revalidatePath(`/colaboradores/${employeeId}`);
}
