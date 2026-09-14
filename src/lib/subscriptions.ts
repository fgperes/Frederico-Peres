import { prisma } from "@/lib/prisma";

// Linha única (tal como PayrollSettings) — controla que módulos avançados
// estão contratados/à medida para este cliente. Por omissão o preditivo
// vem desligado: um módulo destes só faz sentido depois de configurado
// especificamente para a empresa/área do cliente.
export async function getModuleSubscription() {
  const existing = await prisma.moduleSubscription.findFirst();
  if (existing) return existing;
  return prisma.moduleSubscription.create({ data: {} });
}
