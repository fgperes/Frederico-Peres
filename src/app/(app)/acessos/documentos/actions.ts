"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isSystemAdmin } from "@/lib/roles";
import { getDocumentBranding } from "@/lib/document-branding";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const MAX_IMAGE_DATA_URL_LENGTH = 400_000; // ~300KB de imagem já redimensionada no browser

async function assertSystemAdmin() {
  const user = await requireUser();
  if (!isSystemAdmin(user.roles)) {
    throw new Error("Apenas o Administrador do Sistema pode configurar a identidade visual dos documentos.");
  }
  return user;
}

export async function updateClientCompanyName(name: string) {
  const user = await assertSystemAdmin();
  const settings = await getDocumentBranding();
  await prisma.documentBrandingSettings.update({
    where: { id: settings.id },
    data: { clientCompanyName: name.trim() || null, updatedById: user.id },
  });
  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "DocumentBrandingSettings",
    entityId: settings.id,
    details: `Nome da empresa cliente: ${name.trim() || "(removido)"}`,
  });
  revalidatePath("/acessos/documentos");
}

// Dados fiscais da empresa cliente — usados no cabeçalho de documentos que
// exigem identificação legal da entidade empregadora, como o recibo de
// vencimento (Payroll).
export async function updateClientCompanyFiscalInfo(data: {
  nif: string;
  address: string;
  socialSecurityNo: string;
}) {
  const user = await assertSystemAdmin();
  const settings = await getDocumentBranding();
  await prisma.documentBrandingSettings.update({
    where: { id: settings.id },
    data: {
      companyNif: data.nif.trim() || null,
      companyAddress: data.address.trim() || null,
      companySocialSecurityNo: data.socialSecurityNo.trim() || null,
      updatedById: user.id,
    },
  });
  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "DocumentBrandingSettings",
    entityId: settings.id,
    details: "Dados fiscais da empresa cliente atualizados",
  });
  revalidatePath("/acessos/documentos");
  revalidatePath("/payroll");
}

export async function uploadClientCompanyLogo(dataUrl: string): Promise<{ error?: string }> {
  try {
    const user = await assertSystemAdmin();
    if (!dataUrl.startsWith("data:image/")) {
      throw new Error("Ficheiro inválido — escolha uma imagem.");
    }
    if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
      throw new Error("Imagem demasiado grande. Escolha um logótipo mais pequeno.");
    }

    const settings = await getDocumentBranding();
    await prisma.documentBrandingSettings.update({
      where: { id: settings.id },
      data: { clientCompanyLogo: dataUrl, updatedById: user.id },
    });
    await logAudit({
      userId: user.id,
      action: "UPDATE",
      entity: "DocumentBrandingSettings",
      entityId: settings.id,
      details: "Logótipo da empresa cliente carregado",
    });
    revalidatePath("/acessos/documentos");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível carregar o logótipo." };
  }
}

export async function removeClientCompanyLogo() {
  const user = await assertSystemAdmin();
  const settings = await getDocumentBranding();
  await prisma.documentBrandingSettings.update({
    where: { id: settings.id },
    data: { clientCompanyLogo: null, updatedById: user.id },
  });
  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "DocumentBrandingSettings",
    entityId: settings.id,
    details: "Logótipo da empresa cliente removido",
  });
  revalidatePath("/acessos/documentos");
}
