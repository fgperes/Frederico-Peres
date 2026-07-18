export const ID_DOCUMENT_TYPES = [
  "CARTAO_CIDADAO",
  "TITULO_RESIDENCIA",
  "PASSAPORTE",
  "BILHETE_IDENTIDADE",
] as const;

export type IdDocumentType = (typeof ID_DOCUMENT_TYPES)[number];

export const ID_DOCUMENT_TYPE_LABELS: Record<IdDocumentType, string> = {
  CARTAO_CIDADAO: "Cartão de Cidadão",
  TITULO_RESIDENCIA: "Título de Residência",
  PASSAPORTE: "Passaporte",
  BILHETE_IDENTIDADE: "Bilhete de Identidade",
};
