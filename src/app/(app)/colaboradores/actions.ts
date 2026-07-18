"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseExcelFile } from "@/lib/excel";
import { ID_DOCUMENT_TYPES } from "@/lib/employee-constants";

const employeeSchema = z.object({
  firstName: z.string().min(1, "Nome próprio obrigatório"),
  lastName: z.string().min(1, "Apelido obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  nif: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{9}$/.test(v), "NIF deve ter 9 dígitos"),
  iban: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v.replace(/\s/g, "")),
      "IBAN inválido"
    ),
  address: z.string().optional(),
  idDocument: z.string().optional(),
  idDocumentType: z.enum(ID_DOCUMENT_TYPES).optional().or(z.literal("")),
  idDocumentExpiry: z.string().optional(),
  idDocumentNoExpiry: z.coerce.boolean().optional(),
  socialSecurityNo: z.string().optional(),
  jobTitle: z.string().min(1, "Função obrigatória"),
  departmentId: z.string().optional(),
  teamId: z.string().optional(),
  locationId: z.string().optional(),
  managerId: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME"]),
  weeklyHours: z.coerce.number().min(0).max(80),
  restrictions: z.string().optional(),
  shiftPreferences: z.string().optional(),
  skills: z.string().optional(),
  hireDate: z.string().optional(),
});

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "recursos")) {
    throw new Error("Sem permissão para editar colaboradores.");
  }
  return user;
}

function toNullable(v?: string) {
  return v && v.length > 0 ? v : null;
}

export async function createEmployee(formData: FormData) {
  const user = await assertCanWrite();

  const raw = Object.fromEntries(formData.entries());
  const parsed = employeeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }
  const data = parsed.data;

  const employee = await prisma.employee.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase().trim(),
      phone: toNullable(data.phone),
      nif: toNullable(data.nif),
      iban: toNullable(data.iban),
      address: toNullable(data.address),
      idDocument: toNullable(data.idDocument),
      idDocumentType: toNullable(data.idDocumentType),
      idDocumentExpiry: data.idDocumentNoExpiry
        ? null
        : data.idDocumentExpiry
          ? new Date(data.idDocumentExpiry)
          : null,
      idDocumentNoExpiry: !!data.idDocumentNoExpiry,
      socialSecurityNo: toNullable(data.socialSecurityNo),
      jobTitle: data.jobTitle,
      departmentId: toNullable(data.departmentId),
      teamId: toNullable(data.teamId),
      locationId: toNullable(data.locationId),
      managerId: toNullable(data.managerId),
      employmentType: data.employmentType,
      weeklyHours: data.weeklyHours,
      restrictions: toNullable(data.restrictions),
      shiftPreferences: toNullable(data.shiftPreferences),
      skills: toNullable(data.skills),
      hireDate: data.hireDate ? new Date(data.hireDate) : null,
      status: "ACTIVE",
    },
  });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "Employee",
    entityId: employee.id,
    details: `${employee.firstName} ${employee.lastName}`,
  });

  revalidatePath("/colaboradores");
  redirect(`/colaboradores/${employee.id}`);
}

export async function updateEmployee(employeeId: string, formData: FormData) {
  const user = await assertCanWrite();

  const raw = Object.fromEntries(formData.entries());
  const parsed = employeeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }
  const data = parsed.data;

  const before = await prisma.employee.findUniqueOrThrow({
    where: { id: employeeId },
  });

  const employee = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase().trim(),
      phone: toNullable(data.phone),
      nif: toNullable(data.nif),
      iban: toNullable(data.iban),
      address: toNullable(data.address),
      idDocument: toNullable(data.idDocument),
      idDocumentType: toNullable(data.idDocumentType),
      idDocumentExpiry: data.idDocumentNoExpiry
        ? null
        : data.idDocumentExpiry
          ? new Date(data.idDocumentExpiry)
          : null,
      idDocumentNoExpiry: !!data.idDocumentNoExpiry,
      socialSecurityNo: toNullable(data.socialSecurityNo),
      jobTitle: data.jobTitle,
      departmentId: toNullable(data.departmentId),
      teamId: toNullable(data.teamId),
      locationId: toNullable(data.locationId),
      managerId: toNullable(data.managerId),
      employmentType: data.employmentType,
      weeklyHours: data.weeklyHours,
      restrictions: toNullable(data.restrictions),
      shiftPreferences: toNullable(data.shiftPreferences),
      skills: toNullable(data.skills),
      hireDate: data.hireDate ? new Date(data.hireDate) : null,
    },
  });

  const historyEntries: { field: string; oldValue: string; newValue: string }[] = [];
  if (before.departmentId !== employee.departmentId) {
    historyEntries.push({
      field: "departmentId",
      oldValue: before.departmentId ?? "-",
      newValue: employee.departmentId ?? "-",
    });
  }
  if (before.jobTitle !== employee.jobTitle) {
    historyEntries.push({
      field: "jobTitle",
      oldValue: before.jobTitle,
      newValue: employee.jobTitle,
    });
  }
  if (historyEntries.length > 0) {
    await prisma.employeeHistory.createMany({
      data: historyEntries.map((h) => ({
        employeeId: employee.id,
        field: h.field,
        oldValue: h.oldValue,
        newValue: h.newValue,
        changedBy: user.name,
      })),
    });
  }

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "Employee",
    entityId: employee.id,
    details: `${employee.firstName} ${employee.lastName}`,
  });

  revalidatePath("/colaboradores");
  revalidatePath(`/colaboradores/${employee.id}`);
}

export async function setEmployeeStatus(employeeId: string, status: "ACTIVE" | "INACTIVE") {
  const user = await assertCanWrite();

  const employee = await prisma.employee.update({
    where: { id: employeeId },
    data: { status },
  });

  await logAudit({
    userId: user.id,
    action: status === "ACTIVE" ? "ACTIVATE" : "DEACTIVATE",
    entity: "Employee",
    entityId: employee.id,
    details: `${employee.firstName} ${employee.lastName}`,
  });

  revalidatePath("/colaboradores");
  revalidatePath(`/colaboradores/${employee.id}`);
}

export type ImportState = {
  error?: string;
  result?: { total: number; created: number; errorReport: string[] };
};

// Dados pessoais obrigatórios do colaborador (não é possível importar uma
// linha sem estes campos): nome próprio, apelido, email e NIF. A função
// (jobTitle) também é exigida, mas por ser um dado organizacional
// obrigatório na base de dados — não é "dado pessoal".
const importRowSchema = z.object({
  firstName: z.coerce.string().trim().min(1, "nome próprio em falta (dado pessoal obrigatório)"),
  lastName: z.coerce.string().trim().min(1, "apelido em falta (dado pessoal obrigatório)"),
  email: z
    .coerce.string()
    .trim()
    .min(1, "email em falta (dado pessoal obrigatório)")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "email inválido"),
  nif: z
    .coerce.string()
    .trim()
    .min(1, "NIF em falta (dado pessoal obrigatório)")
    .regex(/^\d{9}$/, "NIF deve ter 9 dígitos"),
  jobTitle: z.coerce.string().trim().min(1, "função em falta"),
  department: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME"]).default("FULL_TIME"),
  weeklyHours: z.coerce.number().min(0).max(80).default(40),
  phone: z.string().optional(),
  hireDate: z.string().optional(),
});

// GR-04 / CD-01 / CD-03: importação em massa de colaboradores via Excel,
// com validação linha a linha e registo em histórico de importações.
export async function importEmployeesAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const user = await assertCanWrite();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Selecione um ficheiro Excel." };

  let rows: Record<string, unknown>[];
  try {
    rows = await parseExcelFile(file);
  } catch {
    return { error: "Não foi possível ler o ficheiro. Confirme que é um Excel válido (.xlsx)." };
  }

  if (rows.length === 0) return { error: "O ficheiro não contém linhas de dados." };

  const departments = await prisma.department.findMany();
  const deptByName = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));

  const importLog = await prisma.importLog.create({
    data: {
      userId: user.id,
      type: "EMPLOYEES",
      fileName: file.name,
      status: "PARTIAL",
      totalRows: rows.length,
    },
  });

  const errorReport: string[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // linha 1 é o cabeçalho
    const parsed = importRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errorReport.push(`Linha ${rowNum}: ${parsed.error.issues.map((iss) => iss.message).join("; ")}`);
      continue;
    }
    const data = parsed.data;

    const exists = await prisma.employee.findUnique({ where: { email: data.email.toLowerCase() } });
    if (exists) {
      errorReport.push(`Linha ${rowNum}: já existe um colaborador com o email ${data.email}.`);
      continue;
    }

    const nifExists = await prisma.employee.findUnique({ where: { nif: data.nif } });
    if (nifExists) {
      errorReport.push(`Linha ${rowNum}: já existe um colaborador com o NIF ${data.nif}.`);
      continue;
    }

    const departmentId = data.department ? deptByName.get(data.department.toLowerCase()) : undefined;

    try {
      await prisma.employee.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email.toLowerCase(),
          jobTitle: data.jobTitle,
          departmentId: departmentId ?? null,
          employmentType: data.employmentType,
          weeklyHours: data.weeklyHours,
          nif: data.nif || null,
          phone: data.phone || null,
          hireDate: data.hireDate ? new Date(data.hireDate) : null,
          status: "ACTIVE",
          importLogId: importLog.id,
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
    entity: "Employee",
    entityId: importLog.id,
    details: `${created}/${rows.length} colaboradores importados de ${file.name}`,
  });

  revalidatePath("/colaboradores");
  revalidatePath("/colaboradores/importar");

  return { result: { total: rows.length, created, errorReport } };
}

export async function revertEmployeeImport(importLogId: string) {
  const user = await assertCanWrite();

  const result = await prisma.employee.deleteMany({ where: { importLogId } });
  await prisma.importLog.update({
    where: { id: importLogId },
    data: { status: "REVERTED" },
  });

  await logAudit({
    userId: user.id,
    action: "REVERT_IMPORT",
    entity: "Employee",
    entityId: importLogId,
    details: `${result.count} colaboradores removidos`,
  });

  revalidatePath("/colaboradores");
  revalidatePath("/colaboradores/importar");
}
