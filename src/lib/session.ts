import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ROLES, type Role } from "@/lib/roles";

export const VIEW_AS_COOKIE = "sgrh_view_as";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;

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
