export const CONTRACT_TYPES = [
  { value: "SEM_TERMO", label: "Sem termo" },
  { value: "TERMO_CERTO", label: "Termo certo" },
  { value: "TERMO_INCERTO", label: "Termo incerto" },
  { value: "PRESTACAO_SERVICOS", label: "Prestação de serviços" },
  { value: "PART_TIME", label: "Part-time" },
] as const;

export const CONTRACT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CONTRACT_TYPES.map((t) => [t.value, t.label])
);
