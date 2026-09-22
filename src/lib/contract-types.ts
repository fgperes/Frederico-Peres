import { prisma } from "@/lib/prisma";

// Tipos de contrato configuráveis (tal como os perfis em RoleDefinition) —
// autoinstala os 5 tipos originais na primeira vez que corre contra uma BD
// que ainda não os tenha (ex.: produção antes da migração ser aplicada).
const BUILTIN_CONTRACT_TYPES = [
  { key: "SEM_TERMO", label: "Sem termo" },
  { key: "TERMO_CERTO", label: "Termo certo" },
  { key: "TERMO_INCERTO", label: "Termo incerto" },
  { key: "PRESTACAO_SERVICOS", label: "Prestação de serviços" },
  { key: "PART_TIME", label: "Part-time" },
];

export async function getContractTypes(): Promise<{ id: string; key: string; label: string; isSystem: boolean }[]> {
  let types = await prisma.contractTypeDefinition.findMany({ orderBy: { createdAt: "asc" } });
  if (types.length === 0) {
    await prisma.contractTypeDefinition.createMany({
      data: BUILTIN_CONTRACT_TYPES.map((t) => ({ ...t, isSystem: true })),
      skipDuplicates: true,
    });
    types = await prisma.contractTypeDefinition.findMany({ orderBy: { createdAt: "asc" } });
  }
  return types;
}

export async function getContractTypeLabels(): Promise<Record<string, string>> {
  const types = await getContractTypes();
  return Object.fromEntries(types.map((t) => [t.key, t.label]));
}

// Deriva a key interna estável (ex.: "ESTÁGIO PROFISSIONAL" -> "ESTAGIO_PROFISSIONAL")
// a partir do nome dado pelo utilizador — usado tanto em Tipos de Contrato
// como na criação inline de um novo tipo a partir de "+ Novo Contrato".
export function slugifyContractTypeKey(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
