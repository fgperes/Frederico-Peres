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

export const EDUCATION_LEVELS = [
  "SEM_ESCOLARIDADE",
  "ENSINO_BASICO",
  "ENSINO_SECUNDARIO",
  "CET",
  "BACHARELATO",
  "LICENCIATURA",
  "POS_GRADUACAO",
  "MESTRADO",
  "DOUTORAMENTO",
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  SEM_ESCOLARIDADE: "Sem escolaridade",
  ENSINO_BASICO: "Ensino Básico",
  ENSINO_SECUNDARIO: "Ensino Secundário",
  CET: "Curso de Especialização Tecnológica",
  BACHARELATO: "Bacharelato",
  LICENCIATURA: "Licenciatura",
  POS_GRADUACAO: "Pós-Graduação",
  MESTRADO: "Mestrado",
  DOUTORAMENTO: "Doutoramento",
};

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export type BloodType = (typeof BLOOD_TYPES)[number];
