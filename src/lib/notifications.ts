import { prisma } from "@/lib/prisma";
import { canWrite, canRead, type Role } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { addDays } from "date-fns";

type SessionUser = {
  id: string;
  roles: Role[];
  employeeId: string | null;
};

export type NotificationItem = {
  id: string;
  label: string;
  count: number;
  href: string;
};

// Notificações calculadas a partir de dados já existentes (pendências reais
// de aprovação/revisão), sem persistência própria por agora.
export async function getNotifications(user: SessionUser): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];
  const scope = await employeeScopeWhere(user);
  const scopedEmployees = await prisma.employee.findMany({ where: scope, select: { id: true } });
  const scopedIds = scopedEmployees.map((e) => e.id);

  if (canWrite(user.roles, "ausencias")) {
    const count = await prisma.absence.count({
      where: { employeeId: { in: scopedIds }, status: "PENDING" },
    });
    if (count > 0) {
      items.push({
        id: "absences",
        label: `${count} pedido(s) de ausência por aprovar`,
        count,
        href: "/ausencias",
      });
    }
  }

  if (canWrite(user.roles, "picagens")) {
    const count = await prisma.timeClockEntry.count({
      where: {
        employeeId: { in: scopedIds },
        hasDeviation: true,
        justificationStatus: "PENDING",
      },
    });
    if (count > 0) {
      items.push({
        id: "deviations",
        label: `${count} desvio(s) de picagem por rever`,
        count,
        href: "/picagens",
      });
    }
  }

  if (canRead(user.roles, "contratos")) {
    const count = await prisma.contract.count({
      where: {
        employeeId: { in: scopedIds },
        status: "ACTIVE",
        endDate: { not: null, lte: addDays(new Date(), 30) },
      },
    });
    if (count > 0) {
      items.push({
        id: "contracts",
        label: `${count} contrato(s) a expirar em 30 dias`,
        count,
        href: "/contratos",
      });
    }
  }

  // Documentos de identificação caducados: o gestor de RH é avisado para
  // pedir a atualização ao(s) colaborador(es) em causa.
  if (canWrite(user.roles, "recursos")) {
    const count = await prisma.employee.count({
      where: {
        id: { in: scopedIds },
        status: "ACTIVE",
        idDocumentNoExpiry: false,
        idDocumentExpiry: { not: null, lt: new Date() },
      },
    });
    if (count > 0) {
      items.push({
        id: "expired-documents",
        label: `${count} documento(s) de identificação caducado(s) — peça atualização`,
        count,
        href: "/colaboradores",
      });
    }
  }

  // O próprio colaborador é avisado de que o seu documento caducou, para
  // enviar uma cópia atualizada.
  if (user.employeeId) {
    const own = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      select: { idDocumentNoExpiry: true, idDocumentExpiry: true },
    });
    if (own && !own.idDocumentNoExpiry && own.idDocumentExpiry && own.idDocumentExpiry < new Date()) {
      items.push({
        id: "own-expired-document",
        label: "O seu documento de identificação caducou — envie uma cópia atualizada",
        count: 1,
        href: `/colaboradores/${user.employeeId}/anexos`,
      });
    }
  }

  return items;
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  return prisma.message.count({ where: { recipientId: userId, readAt: null } });
}
