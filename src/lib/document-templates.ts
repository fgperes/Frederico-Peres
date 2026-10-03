import { prisma } from "@/lib/prisma";

// Modelos de documento para exportação (Relatórios → Modelos de Documentos):
// cada modelo é uma lista ordenada de blocos. Cada bloco só mostra dados já
// existentes — colunas/linhas de um relatório, a grelha de escala mensal, o
// logótipo configurado, ou texto fixo — nunca um valor calculado no próprio
// modelo (mesma filosofia do editor de layout do recibo de vencimento).

export type DocumentBlockType = "HEADER_LOGO" | "TEXT" | "REPORT_TABLE" | "SCHEDULE_GRID" | "SIGNATURE";

export const BLOCK_TYPE_LABELS: Record<DocumentBlockType, string> = {
  HEADER_LOGO: "Cabeçalho com logótipo",
  TEXT: "Texto",
  REPORT_TABLE: "Tabela de um relatório",
  SCHEDULE_GRID: "Grelha de escala mensal",
  SIGNATURE: "Área de assinatura",
};

export type DocumentBlock =
  | { id: string; type: "HEADER_LOGO"; title: string; subtitle: string }
  | { id: string; type: "TEXT"; text: string }
  | { id: string; type: "REPORT_TABLE"; reportKey: string; title: string }
  | { id: string; type: "SCHEDULE_GRID"; title: string }
  | { id: string; type: "SIGNATURE"; mode: "PER_EMPLOYEE" | "SINGLE"; label: string };

// Omit que distribui sobre a união — Omit<DocumentBlock, "id"> "achata" os
// ramos (perde a ligação ao discriminante "type"); isto preserva cada ramo.
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export function defaultBlockForType(type: DocumentBlockType): DistributiveOmit<DocumentBlock, "id"> {
  switch (type) {
    case "HEADER_LOGO":
      return { type, title: "people4people — SGRH", subtitle: "" };
    case "TEXT":
      return { type, text: "" };
    case "REPORT_TABLE":
      return { type, reportKey: "utilizadores", title: "" };
    case "SCHEDULE_GRID":
      return { type, title: "Escala mensal" };
    case "SIGNATURE":
      return { type, mode: "PER_EMPLOYEE", label: "Assinatura do colaborador" };
  }
}

export function parseDocumentBlocks(json: string): DocumentBlock[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export type DocumentTemplateData = {
  id: string;
  name: string;
  description: string | null;
  blocks: DocumentBlock[];
  updatedAt: Date;
};

export async function getDocumentTemplates(): Promise<DocumentTemplateData[]> {
  const rows = await prisma.documentTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    blocks: parseDocumentBlocks(r.blocksJson),
    updatedAt: r.updatedAt,
  }));
}

export async function getDocumentTemplate(id: string): Promise<DocumentTemplateData | null> {
  const row = await prisma.documentTemplate.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    blocks: parseDocumentBlocks(row.blocksJson),
    updatedAt: row.updatedAt,
  };
}
