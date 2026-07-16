import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/roles";

// Configuração "edge-safe": sem Prisma/bcrypt, usada pelo middleware.
// A configuração completa (com o provider Credentials) está em auth.ts.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id as string;
        token.roles = (user as { roles: Role[] }).roles;
        token.employeeId = (user as { employeeId: string | null }).employeeId;
        token.mustChangePassword = (
          user as { mustChangePassword: boolean }
        ).mustChangePassword;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = (token.roles as Role[]) ?? [];
        session.user.employeeId = (token.employeeId as string | null) ?? null;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
};
