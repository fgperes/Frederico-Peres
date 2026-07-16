export const ROLES = [
  "ADMIN_SISTEMA",
  "ADMIN_RH",
  "GESTOR_EQUIPA",
  "COLABORADOR",
  "RH_CONTRATOS",
  "AUDITOR",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN_SISTEMA: "Administrador do Sistema",
  ADMIN_RH: "Administrador de RH",
  GESTOR_EQUIPA: "Gestor de Equipa",
  COLABORADOR: "Colaborador",
  RH_CONTRATOS: "Recursos Humanos — Contratos",
  AUDITOR: "Auditor / Só-Leitura",
};

// Módulos que cada perfil pode aceder e respetivo nível de escrita.
// "rw" = leitura/escrita, "ro" = apenas leitura, "own" = apenas os seus próprios dados
export type AccessLevel = "rw" | "ro" | "own" | "none";

export type Module =
  | "recursos"
  | "horarios"
  | "picagens"
  | "ausencias"
  | "contratos"
  | "acessos"
  | "integracoes";

const MATRIX: Record<Role, Record<Module, AccessLevel>> = {
  ADMIN_SISTEMA: {
    recursos: "rw",
    horarios: "rw",
    picagens: "rw",
    ausencias: "rw",
    contratos: "rw",
    acessos: "rw",
    integracoes: "rw",
  },
  ADMIN_RH: {
    recursos: "rw",
    horarios: "rw",
    picagens: "rw",
    ausencias: "rw",
    contratos: "rw",
    acessos: "ro",
    integracoes: "rw",
  },
  GESTOR_EQUIPA: {
    recursos: "rw",
    horarios: "rw",
    picagens: "rw",
    ausencias: "rw",
    contratos: "ro",
    acessos: "none",
    integracoes: "none",
  },
  COLABORADOR: {
    recursos: "own",
    horarios: "own",
    picagens: "own",
    ausencias: "own",
    contratos: "own",
    acessos: "none",
    integracoes: "none",
  },
  RH_CONTRATOS: {
    recursos: "ro",
    horarios: "ro",
    picagens: "ro",
    ausencias: "ro",
    contratos: "rw",
    acessos: "none",
    integracoes: "none",
  },
  AUDITOR: {
    recursos: "ro",
    horarios: "ro",
    picagens: "ro",
    ausencias: "ro",
    contratos: "ro",
    acessos: "ro",
    integracoes: "ro",
  },
};

export function accessFor(roles: Role[], mod: Module): AccessLevel {
  const levels = roles.map((r) => MATRIX[r]?.[mod] ?? "none");
  if (levels.includes("rw")) return "rw";
  if (levels.includes("ro")) return "ro";
  if (levels.includes("own")) return "own";
  return "none";
}

export function canWrite(roles: Role[], mod: Module): boolean {
  return accessFor(roles, mod) === "rw";
}

export function canRead(roles: Role[], mod: Module): boolean {
  const level = accessFor(roles, mod);
  return level === "rw" || level === "ro" || level === "own";
}

export function isManagerLike(roles: Role[]): boolean {
  return roles.some((r) =>
    ["ADMIN_SISTEMA", "ADMIN_RH", "GESTOR_EQUIPA"].includes(r)
  );
}

export function isSystemAdmin(roles: Role[]): boolean {
  return roles.includes("ADMIN_SISTEMA");
}
