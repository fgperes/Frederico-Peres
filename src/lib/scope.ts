import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import type { Prisma } from "@prisma/client";

type ScopedUser = {
  id: string;
  roles: Role[];
  employeeId: string | null;
};

const BROAD_READ_ROLES: Role[] = [
  "ADMIN_SISTEMA",
  "ADMIN_RH",
  "AUDITOR",
  "RH_CONTRATOS",
];

/**
 * Devolve a cláusula "where" do Prisma que restringe os colaboradores
 * visíveis por um utilizador, de acordo com o seu(s) perfil(is):
 * - Perfis de leitura ampla veem todos os colaboradores.
 * - Gestor de Equipa vê apenas os colaboradores dos departamentos onde tem esse perfil.
 * - Colaborador vê apenas a sua própria ficha.
 */
export async function employeeScopeWhere(
  user: ScopedUser
): Promise<Prisma.EmployeeWhereInput> {
  if (user.roles.some((r) => BROAD_READ_ROLES.includes(r))) {
    return {};
  }

  if (user.roles.includes("GESTOR_EQUIPA")) {
    const scopedRoles = await prisma.userRole.findMany({
      where: { userId: user.id, role: "GESTOR_EQUIPA", departmentId: { not: null } },
      select: { departmentId: true },
    });
    const departmentIds = scopedRoles
      .map((r) => r.departmentId)
      .filter((id): id is string => !!id);

    if (departmentIds.length === 0) {
      return user.employeeId ? { id: user.employeeId } : { id: "__none__" };
    }
    return { departmentId: { in: departmentIds } };
  }

  // Colaborador: apenas a própria ficha
  return user.employeeId ? { id: user.employeeId } : { id: "__none__" };
}
