import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMatrixLoaded, type Role } from "@/lib/roles";
import { verifyMobileToken } from "@/lib/mobile/jwt";

// Forma idêntica ao que `getCurrentUser()` devolve na app web, para que as
// funções de `actions.ts` reutilizadas pela API mobile recebam exatamente o
// mesmo tipo de objeto que já esperam.
export type MobileCurrentUser = {
  id: string;
  email: string;
  name: string | null;
  roles: Role[];
  employeeId: string | null;
  mustChangePassword: boolean;
  canPublishNews: boolean;
  realRoles: Role[];
  isViewingAs: boolean;
};

function bearerTokenFrom(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

/**
 * Resolve o utilizador autenticado de um pedido à API mobile.
 *
 * Importante: o perfil devolvido é **sempre** forçado a `COLABORADOR`,
 * independentemente do(s) perfil(is) reais da conta — a app mobile nunca
 * expõe funcionalidades de gestão, mesmo que a conta seja Administrador na
 * app web. `realRoles` guarda os perfis reais só para auditoria.
 */
export async function getMobileUser(req: Request): Promise<MobileCurrentUser | null> {
  const token = bearerTokenFrom(req);
  if (!token) return null;

  const payload = await verifyMobileToken(token);
  if (!payload) return null;

  await ensureMatrixLoaded();

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { roles: true, employee: true },
  });
  if (!user || !user.active) return null;
  if (user.employee?.id !== payload.employeeId) return null; // token invalidado por troca de colaborador associado

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: ["COLABORADOR"],
    employeeId: user.employee?.id ?? null,
    mustChangePassword: user.mustChangePassword,
    canPublishNews: user.canPublishNews,
    realRoles: user.roles.map((r) => r.role) as Role[],
    isViewingAs: true,
  };
}

/** Sentinela lançada por `requireMobileUser` quando o pedido não está autenticado. */
export class MobileAuthError extends Error {
  readonly response = NextResponse.json({ error: "Não autenticado." }, { status: 401 });
}

/** Como `getMobileUser`, mas lança `MobileAuthError` em vez de devolver `null` — útil
 * para rotas onde o fluxo normal já assume um utilizador autenticado. */
export async function requireMobileUser(req: Request): Promise<MobileCurrentUser> {
  const user = await getMobileUser(req);
  if (!user) throw new MobileAuthError();
  return user;
}
