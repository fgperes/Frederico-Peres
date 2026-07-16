import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";

type SessionUser = {
  id: string;
  roles: Role[];
  employeeId: string | null;
};

// Perfis que podem enviar mensagens rápidas a qualquer utilizador ativo.
const UNRESTRICTED_ROLES: Role[] = [
  "ADMIN_SISTEMA",
  "ADMIN_RH",
  "GESTOR_EQUIPA",
  "RH_CONTRATOS",
  "AUDITOR",
];

export type Recipient = { id: string; name: string; email: string };

// Regra de negócio: o perfil Colaborador só pode enviar mensagens ao(s)
// Administrador(es) de RH, ao(s) Gestor(es) de Equipa do seu departamento
// (responsáveis por horários) e ao seu supervisor direto (chefia).
// Os restantes perfis podem enviar a qualquer utilizador ativo.
export async function getAllowedRecipients(user: SessionUser): Promise<Recipient[]> {
  if (user.roles.some((r) => UNRESTRICTED_ROLES.includes(r))) {
    const users = await prisma.user.findMany({
      where: { active: true, id: { not: user.id } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return users;
  }

  // Apenas COLABORADOR a partir daqui.
  const recipients = new Map<string, Recipient>();

  const rhAdmins = await prisma.user.findMany({
    where: { active: true, roles: { some: { role: "ADMIN_RH" } } },
    select: { id: true, name: true, email: true },
  });
  rhAdmins.forEach((u) => recipients.set(u.id, u));

  if (user.employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      include: { manager: { include: { user: true } } },
    });

    if (employee?.departmentId) {
      const scheduleManagers = await prisma.user.findMany({
        where: {
          active: true,
          roles: { some: { role: "GESTOR_EQUIPA", departmentId: employee.departmentId } },
        },
        select: { id: true, name: true, email: true },
      });
      scheduleManagers.forEach((u) => recipients.set(u.id, u));
    }

    if (employee?.manager?.user) {
      const { id, name, email } = employee.manager.user;
      recipients.set(id, { id, name, email });
    }
  }

  recipients.delete(user.id);
  return Array.from(recipients.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function canMessageRecipient(user: SessionUser, recipientId: string): Promise<boolean> {
  if (recipientId === user.id) return false;
  const allowed = await getAllowedRecipients(user);
  return allowed.some((r) => r.id === recipientId);
}
