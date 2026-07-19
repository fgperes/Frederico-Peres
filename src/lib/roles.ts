import { prisma } from "@/lib/prisma";

export type Role = string;

export type RoleDefinitionInfo = { key: Role; label: string; isSystem: boolean };

// Os 6 perfis originais da aplicação. Semeados automaticamente na base de
// dados (ver ensureMatrixLoaded) caso ainda não existam. ADMIN_SISTEMA e
// COLABORADOR são estruturais (isSystem) e não podem ser eliminados — o
// resto pode ser renomeado ou apagado como qualquer perfil criado depois.
const BUILTIN_ROLE_DEFS: RoleDefinitionInfo[] = [
  { key: "ADMIN_SISTEMA", label: "Administrador do Sistema", isSystem: true },
  { key: "ADMIN_RH", label: "Administrador de RH", isSystem: false },
  { key: "GESTOR_EQUIPA", label: "Gestor de Equipa", isSystem: false },
  { key: "COLABORADOR", label: "Colaborador", isSystem: true },
  { key: "RH_CONTRATOS", label: "Recursos Humanos — Contratos", isSystem: false },
  { key: "AUDITOR", label: "Auditor / Só-Leitura", isSystem: false },
];

// Arrays/objetos mutados no próprio local (nunca reatribuídos) para que
// todos os módulos que os importam vejam sempre o valor atual — o mesmo
// truque já usado por runtimeMatrix, sem precisar de tocar em dezenas de
// ficheiros consumidores.
export const ROLES: Role[] = BUILTIN_ROLE_DEFS.map((d) => d.key);
export const ROLE_LABELS: Record<Role, string> = Object.fromEntries(
  BUILTIN_ROLE_DEFS.map((d) => [d.key, d.label])
);
export const CONFIGURABLE_ROLES: Role[] = ROLES.filter((r) => r !== "COLABORADOR");

let runtimeRoleDefs: RoleDefinitionInfo[] = BUILTIN_ROLE_DEFS.map((d) => ({ ...d }));

function rebuildDerivedRoleState() {
  const keys = runtimeRoleDefs.map((d) => d.key);

  ROLES.length = 0;
  ROLES.push(...keys);

  for (const k of Object.keys(ROLE_LABELS)) delete ROLE_LABELS[k];
  for (const d of runtimeRoleDefs) ROLE_LABELS[d.key] = d.label;

  CONFIGURABLE_ROLES.length = 0;
  CONFIGURABLE_ROLES.push(...keys.filter((k) => k !== "COLABORADOR"));
}

export function getRoleDefinitionsSnapshot(): RoleDefinitionInfo[] {
  return runtimeRoleDefs;
}

// Módulos que cada perfil pode aceder e respetivo nível de escrita.
// "rw" = leitura/escrita, "ro" = apenas leitura, "own" = apenas os seus próprios dados
export type AccessLevel = "rw" | "ro" | "own" | "none";

export type Module =
  | "recursos"
  | "horarios"
  | "picagens"
  | "ausencias"
  | "ferias"
  | "contratos"
  | "acessos"
  | "integracoes"
  | "payroll"
  | "relatorios";

export const MODULES: Module[] = [
  "recursos",
  "horarios",
  "picagens",
  "ausencias",
  "ferias",
  "contratos",
  "acessos",
  "integracoes",
  "payroll",
  "relatorios",
];

export const MODULE_LABELS: Record<Module, string> = {
  recursos: "Colaboradores e Estrutura",
  horarios: "Horários",
  picagens: "Picagens",
  ausencias: "Ausências",
  ferias: "Férias",
  contratos: "Contratos",
  acessos: "Perfis e Acessos",
  integracoes: "Integrações",
  payroll: "Payroll",
  relatorios: "Relatórios",
};

function allNoneRow(): Record<Module, AccessLevel> {
  return Object.fromEntries(MODULES.map((m) => [m, "none"])) as Record<Module, AccessLevel>;
}

// Matriz por omissão dos 6 perfis originais — usada como base sempre que não
// existir um desvio gravado em RolePermission (BD). Um perfil novo (criado
// pelo Administrador do Sistema) começa sempre sem acesso a nada (allNoneRow),
// por segurança — o acesso é depois concedido explicitamente na matriz.
const DEFAULT_MATRIX: Record<Role, Record<Module, AccessLevel>> = {
  ADMIN_SISTEMA: {
    recursos: "rw",
    horarios: "rw",
    picagens: "rw",
    ausencias: "rw",
    ferias: "rw",
    contratos: "rw",
    acessos: "rw",
    integracoes: "rw",
    payroll: "rw",
    relatorios: "rw",
  },
  ADMIN_RH: {
    recursos: "rw",
    horarios: "rw",
    picagens: "rw",
    ausencias: "rw",
    ferias: "rw",
    contratos: "rw",
    acessos: "ro",
    integracoes: "rw",
    payroll: "rw",
    relatorios: "rw",
  },
  GESTOR_EQUIPA: {
    recursos: "rw",
    horarios: "rw",
    picagens: "rw",
    ausencias: "rw",
    ferias: "rw",
    contratos: "ro",
    acessos: "none",
    integracoes: "none",
    payroll: "none",
    relatorios: "ro",
  },
  COLABORADOR: {
    recursos: "own",
    horarios: "own",
    picagens: "own",
    ausencias: "own",
    ferias: "own",
    contratos: "own",
    acessos: "none",
    integracoes: "none",
    payroll: "own",
    relatorios: "none",
  },
  RH_CONTRATOS: {
    recursos: "ro",
    horarios: "ro",
    picagens: "ro",
    ausencias: "ro",
    ferias: "ro",
    contratos: "rw",
    acessos: "none",
    integracoes: "none",
    payroll: "ro",
    relatorios: "ro",
  },
  AUDITOR: {
    recursos: "ro",
    horarios: "ro",
    picagens: "ro",
    ausencias: "ro",
    ferias: "ro",
    contratos: "ro",
    acessos: "ro",
    integracoes: "ro",
    payroll: "ro",
    relatorios: "ro",
  },
};

// Matriz efetiva em memória: começa igual à matriz por omissão e é
// atualizada com os desvios gravados pelo Administrador do Sistema. As
// funções accessFor/canWrite/canRead continuam síncronas (usadas em
// dezenas de páginas) — a carga a partir da BD acontece uma única vez por
// processo, em getCurrentUser(), antes de qualquer verificação de acesso.
let runtimeMatrix: Record<Role, Record<Module, AccessLevel>> = Object.fromEntries(
  ROLES.map((r) => [r, { ...(DEFAULT_MATRIX[r] ?? allNoneRow()) }])
);
let matrixLoaded = false;

export async function ensureMatrixLoaded(): Promise<void> {
  if (matrixLoaded) return;
  matrixLoaded = true; // marca já para não disparar várias cargas em paralelo
  try {
    let defs = await prisma.roleDefinition.findMany({ orderBy: { createdAt: "asc" } });

    // Autoinstalação: semeia os 6 perfis originais na BD caso ainda não lá
    // estejam (ex.: primeira vez que esta versão corre contra a BD).
    const existingKeys = new Set(defs.map((d) => d.key));
    const missing = BUILTIN_ROLE_DEFS.filter((b) => !existingKeys.has(b.key));
    if (missing.length > 0) {
      await prisma.roleDefinition.createMany({ data: missing, skipDuplicates: true });
      defs = await prisma.roleDefinition.findMany({ orderBy: { createdAt: "asc" } });
    }

    runtimeRoleDefs = defs.map((d) => ({ key: d.key, label: d.label, isSystem: d.isSystem }));
    rebuildDerivedRoleState();

    runtimeMatrix = Object.fromEntries(
      ROLES.map((r) => [r, { ...(DEFAULT_MATRIX[r] ?? allNoneRow()) }])
    );

    const overrides = await prisma.rolePermission.findMany();
    for (const o of overrides) {
      const mod = o.module as Module;
      if (runtimeMatrix[o.role] && mod in runtimeMatrix[o.role]) {
        runtimeMatrix[o.role][mod] = o.accessLevel as AccessLevel;
      }
    }
  } catch {
    // Sem BD acessível (ex.: build estático) — mantém os valores por omissão.
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

// Reflete de imediato, sem esperar por reload, a criação/edição/eliminação
// de um tipo de perfil feita em Perfis e Acessos → Perfis.
export function applyRoleCreate(def: RoleDefinitionInfo): void {
  runtimeRoleDefs = [...runtimeRoleDefs, def];
  rebuildDerivedRoleState();
  runtimeMatrix = { ...runtimeMatrix, [def.key]: allNoneRow() };
}

export function applyRoleUpdate(key: Role, label: string): void {
  runtimeRoleDefs = runtimeRoleDefs.map((d) => (d.key === key ? { ...d, label } : d));
  rebuildDerivedRoleState();
}

export function applyRoleDelete(key: Role): void {
  runtimeRoleDefs = runtimeRoleDefs.filter((d) => d.key !== key);
  rebuildDerivedRoleState();
  const next = { ...runtimeMatrix };
  delete next[key];
  runtimeMatrix = next;
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
