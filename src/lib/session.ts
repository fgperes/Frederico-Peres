import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ROLES, ensureMatrixLoaded, type Role } from "@/lib/roles";

export const VIEW_AS_COOKIE = "sgrh_view_as";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;

  // Garante que a matriz de acessos (com os desvios gravados em Perfis e
  // Acessos) está carregada antes de qualquer verificação canWrite/canRead
  // nesta requisição — recarrega a cada pedido (ver comentário em
  // ensureMatrixLoaded) para que as alterações feitas pelo Administrador do
  // Sistema fiquem em vigor de imediato, mesmo que o pedido seguinte caia
  // numa instância serverless diferente da que gravou a alteração.
  await ensureMatrixLoaded();

  // O token JWT da sessão (roles, canPublishNews, mustChangePassword,
  // active) só é preenchido no login e fica congelado até expirar (até 4h,
  // ver auth.config.ts) — sem isto, mudar o perfil ou a permissão de
  // publicar notícias de um utilizador já autenticado não tinha qualquer
  // efeito enquanto a sessão dele continuasse válida. Revalida sempre estes
  // campos contra a BD para que as alterações feitas pelo Administrador do
  // Sistema se apliquem no pedido seguinte do utilizador afetado, e não só
  // depois de voltar a fazer login.
  const live = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { active: true, canPublishNews: true, mustChangePassword: true, roles: { select: { role: true } } },
  });
  if (!live || !live.active) return null;

  session.user.roles = live.roles.map((r) => r.role as Role);
  session.user.canPublishNews = live.canPublishNews;
  session.user.mustChangePassword = live.mustChangePassword;

  const realRoles = session.user.roles;
  const isRealSystemAdmin = realRoles.includes("ADMIN_SISTEMA");

  // Modo "pré-visualizar como": só o Administrador do Sistema pode ativar,
  // e a verificação usa sempre os perfis reais da sessão (não o cookie),
  // para que ninguém consiga escalar privilégios adulterando o cookie.
  if (isRealSystemAdmin) {
    const cookieStore = await cookies();
    const viewAs = cookieStore.get(VIEW_AS_COOKIE)?.value;
    if (viewAs && (ROLES as readonly string[]).includes(viewAs)) {
      return {
        ...session.user,
        roles: [viewAs as Role],
        realRoles,
        isViewingAs: true,
      };
    }
  }

  return { ...session.user, realRoles, isViewingAs: false };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.some((r) => user.roles.includes(r))) {
    redirect("/dashboard?error=forbidden");
  }
  return user;
}
