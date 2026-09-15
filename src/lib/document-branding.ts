import { prisma } from "@/lib/prisma";

// Linha única (tal como ModuleSubscription/PayrollSettings) — identidade
// visual da empresa cliente usada no cabeçalho dos documentos exportáveis.
export async function getDocumentBranding() {
  const existing = await prisma.documentBrandingSettings.findFirst();
  if (existing) return existing;
  return prisma.documentBrandingSettings.create({ data: {} });
}
