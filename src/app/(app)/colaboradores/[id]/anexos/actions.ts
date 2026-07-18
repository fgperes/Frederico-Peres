"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const MAX_FILE_DATA_URL_LENGTH = 3_000_000; // ~2.2MB de ficheiro em base64

// Além de quem pode editar colaboradores (RH/gestão), o próprio
// colaborador pode gerir os seus anexos — é assim que consegue responder
// ao pedido de atualização de um documento de identificação caducado.
async function assertAccess(employeeId: string) {
  const user = await requireUser();
  const scope = await employeeScopeWhere(user);
  const employee = await prisma.employee.findFirst({ where: { AND: [{ id: employeeId }, scope] } });
  if (!employee) throw new Error("Colaborador não encontrado.");

  const canManage = canWrite(user.roles, "recursos") || user.employeeId === employee.id;
  if (!canManage) throw new Error("Sem permissão para gerir anexos deste colaborador.");

  return { user, employee };
}

export async function uploadEmployeeDocument(employeeId: string, formData: FormData) {
  const { user, employee } = await assertAccess(employeeId);

  const label = String(formData.get("label") ?? "").trim();
  const fileName = String(formData.get("fileName") ?? "");
  const dataUrl = String(formData.get("fileData") ?? "");

  if (!label) throw new Error("Indique uma etiqueta para o anexo.");
  if (!dataUrl.startsWith("data:")) throw new Error("Ficheiro inválido.");
  if (dataUrl.length > MAX_FILE_DATA_URL_LENGTH) {
    throw new Error("Ficheiro demasiado grande (máximo aprox. 2MB).");
  }

  const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
  const mimeType = mimeMatch?.[1] ?? "application/octet-stream";

  await prisma.employeeDocument.create({
    data: {
      employeeId,
      name: label,
      type: mimeType,
      fileName,
      fileData: dataUrl,
      uploadedById: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "EmployeeDocument",
    details: `${label} — ${employee.firstName} ${employee.lastName}`,
  });

  revalidatePath(`/colaboradores/${employeeId}/anexos`);
}

export async function deleteEmployeeDocument(employeeId: string, documentId: string) {
  const { user } = await assertAccess(employeeId);

  await prisma.employeeDocument.deleteMany({ where: { id: documentId, employeeId } });
  await logAudit({ userId: user.id, action: "DELETE", entity: "EmployeeDocument", entityId: documentId });

  revalidatePath(`/colaboradores/${employeeId}/anexos`);
}
