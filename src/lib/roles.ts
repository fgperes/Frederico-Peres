import { prisma } from "@/lib/prisma";

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
  | "integracoes"
  | "payroll";

export const MODULES: Module[] = [
  "recursos",
  "horarios",
  "picagens",
  "ausencias",
  "contratos",
  "acessos",
  "integracoes",
  "payroll",
];

export const MODULE_LABELS: Record<Module, string> = {
  recursos: "Colaboradores e Estrutura",
  horarios: "Horários",
  picagens: "Picagens",
  ausencias: "Ausências",
  contratos: "Contratos",
  acessos: "Perfis e Acessos",
  integracoes: "Integrações",
  payroll: "Payroll",
};

// Perfis cujo acesso pode ser reconfigurado em Perfis e Acessos. O
// Colaborador fica de fora: os seus módulos são "own" (dados próprios),
// um conceito diferente de rw/ro/none que não faz sentido reatribuir aqui.
export const CONFIGURABLE_ROLES: Role[] = [
  "ADMIN_SISTEMA",
  "ADMIN_RH",
  "GESTOR_EQUIPA",
  "RH_CONTRATOS",
  "AUDITOR",
];

// Matriz por omissão — usada como base sempre que não existir um desvio
// gravado em RolePermission (BD). Alterada em runtime por loadMatrixOverrides().
const DEFAULT_MATRIX: Record<Role, Record<Module, AccessLevel>> = {
  ADMIN_SISTEMA: {
    recursos: "rw",
    horarios: "rw",
    picagens: "rw",
    ausencias: "rw",
    contratos: "rw",
    acessos: "rw",
    integracoes: "rw",
    payroll: "rw",
  },
  ADMIN_RH: {
    recursos: "rw",
    horarios: "rw",
    picagens: "rw",
    ausencias: "rw",
    contratos: "rw",
    acessos: "ro",
    integracoes: "rw",
    payroll: "rw",
  },
  GESTOR_EQUIPA: {
    recursos: "rw",
    horarios: "rw",
    picagens: "rw",
    ausencias: "rw",
    contratos: "ro",
    acessos: "none",
    integracoes: "none",
    payroll: "none",
  },
  COLABORADOR: {
    recursos: "own",
    horarios: "own",
    picagens: "own",
    ausencias: "own",
    contratos: "own",
    acessos: "none",
    integracoes: "none",
    payroll: "own",
  },
  RH_CONTRATOS: {
    recursos: "ro",
    horarios: "ro",
    picagens: "ro",
    ausencias: "ro",
    contratos: "rw",
    acessos: "none",
    integracoes: "none",
    payroll: "ro",
  },
  AUDITOR: {
    recursos: "ro",
    horarios: "ro",
    picagens: "ro",
    ausencias: "ro",
    contratos: "ro",
    acessos: "ro",
    integracoes: "ro",
    payroll: "ro",
  },
};

function cloneMatrix() {
  return Object.fromEntries(
    Object.entries(DEFAULT_MATRIX).map(([role, mods]) => [role, { ...mods }])
  ) as Record<Role, Record<Module, AccessLevel>>;
}

// Matriz efetiva em memória: começa igual à matriz por omissão e é
// atualizada com os desvios gravados pelo Administrador do Sistema. As
// funções accessFor/canWrite/canRead continuam síncronas (usadas em
// dezenas de páginas) — a carga a partir da BD acontece uma única vez por
// processo, em getCurrentUser(), antes de qualquer verificação de acesso.
let runtimeMatrix: Record<Role, Record<Module, AccessLevel>> = cloneMatrix();
let matrixLoaded = false;

export async function ensureMatrixLoaded(): Promise<void> {
  if (matrixLoaded) return;
  matrixLoaded = true; // marca já para não disparar várias cargas em paralelo
  try {
    const overrides = await prisma.rolePermission.findMany();
    const next = cloneMatrix();
    for (const o of overrides) {
      const role = o.role as Role;
      const mod = o.module as Module;
      if (next[role] && mod in next[role]) {
        next[role][mod] = o.accessLevel as AccessLevel;
      }
    }
    runtimeMatrix = next;
  } catch {
    // Sem BD acessível (ex.: build estático) — mantém a matriz por omissão.
    matrixLoaded = false;
  }
}

export function getMatrixSnapshot(): Record<Role, Record<Module, AccessLevel>> {
  return runtimeMatrix;
}

// Aplica imediatamente as alterações guardadas, sem esperar por um reload —
// chamado pela server action que grava a matriz em Perfis e Acessos.
export function applyMatrixOverrides(
  changes: { role: Role; module: Module; accessLevel: AccessLevel }[]
): void {
  const next = { ...runtimeMatrix };
  for (const c of changes) {
    next[c.role] = { ...next[c.role], [c.module]: c.accessLevel };
  }
  runtimeMatrix = next;
  matrixLoaded = true;
}

export function accessFor(roles: Role[], mod: Module): AccessLevel {
  const levels = roles.map((r) => runtimeMatrix[r]?.[mod] ?? "none");
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

// Só o Administrador do Sistema e o Administrador de RH podem criar/gerir a
// conta de acesso de um colaborador diretamente na ficha do colaborador.
export function canManageEmployeeAccess(roles: Role[]): boolean {
  return roles.includes("ADMIN_SISTEMA") || roles.includes("ADMIN_RH");
}
