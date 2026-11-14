import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import {
  getVacationType,
  groupIntoPeriods,
  CANCEL_REQUEST_MARKER,
  type VacationDayRow,
} from "@/lib/vacation";
import { decideVacationPeriod } from "@/app/(app)/ferias/actions";
import { decideAbsence } from "@/app/(app)/ausencias/actions";

// `requireMobileUser` força sempre roles=["COLABORADOR"] (a app mobile nunca
// expõe funcionalidades de gestão por omissão — ver o comentário em
// src/lib/mobile/current-user.ts). Esta rota é a única exceção deliberada:
// expõe a fila de aprovação a quem realmente tem perfil de gestão
// (`realRoles`), porque foi pedido explicitamente como funcionalidade da
// app. Para isso, substitui `roles` por `realRoles` apenas neste objeto
// local, usado só aqui — o resto da API mobile continua restrito como antes.
function asApprover(user: Awaited<ReturnType<typeof requireMobileUser>>) {
  return { ...user, roles: user.realRoles };
}

type ApprovalItem = {
  key: string;
  kind: "VACATION_PERIOD" | "VACATION_CANCEL" | "ABSENCE";
  absenceIds: string[];
  employeeName: string;
  typeLabel: string;
  startDate: string;
  endDate: string;
  days: number;
};

export async function GET(req: Request) {
  try {
    const mobileUser = await requireMobileUser(req);
    const approver = asApprover(mobileUser);

    const canFerias = canWrite(approver.roles, "ferias");
    const canAusencias = canWrite(approver.roles, "ausencias");
    if (!canFerias && !canAusencias) {
      return NextResponse.json({ canApprove: false, items: [] });
    }

    const scope = await employeeScopeWhere(approver);
    const scopedEmployees = await prisma.employee.findMany({
      where: scope,
      select: { id: true, firstName: true, lastName: true },
    });
    const scopedIds = scopedEmployees.map((e) => e.id);
    const nameOf = new Map(scopedEmployees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]));

    const items: ApprovalItem[] = [];

    if (canFerias) {
      const type = await getVacationType().catch(() => null);
      const pending = type
        ? await prisma.absence.findMany({
            where: {
              employeeId: { in: scopedIds },
              absenceTypeId: type.id,
              OR: [{ status: "PENDING" }, { status: "APPROVED", reason: CANCEL_REQUEST_MARKER }],
            },
            orderBy: { startDate: "asc" },
          })
        : [];

      const rows: VacationDayRow[] = pending.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        employeeName: nameOf.get(a.employeeId) ?? "Colaborador",
        date: a.startDate,
        status: a.status,
        reason: a.reason,
      }));

      for (const p of groupIntoPeriods(rows)) {
        items.push({
          key: `vacation-${p.employeeId}-${p.startDate.toISOString()}`,
          kind: p.kind === "CANCEL_PENDING" ? "VACATION_CANCEL" : "VACATION_PERIOD",
          absenceIds: p.absenceIds,
          employeeName: p.employeeName,
          typeLabel: p.kind === "CANCEL_PENDING" ? "Pedido de cancelamento de férias" : "Pedido de férias",
          startDate: p.startDate.toISOString(),
          endDate: p.endDate.toISOString(),
          days: p.absenceIds.length,
        });
      }
    }

    if (canAusencias) {
      const pending = await prisma.absence.findMany({
        where: { employeeId: { in: scopedIds }, status: "PENDING", absenceType: { isVacation: false } },
        include: { absenceType: true },
        orderBy: { startDate: "asc" },
      });

      for (const a of pending) {
        items.push({
          key: `absence-${a.id}`,
          kind: "ABSENCE",
          absenceIds: [a.id],
          employeeName: nameOf.get(a.employeeId) ?? "Colaborador",
          typeLabel: a.absenceType.name,
          startDate: a.startDate.toISOString(),
          endDate: a.endDate.toISOString(),
          days: a.days,
        });
      }
    }

    items.sort((a, b) => a.startDate.localeCompare(b.startDate));

    return NextResponse.json({ canApprove: true, items });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const mobileUser = await requireMobileUser(req);
    const approver = asApprover(mobileUser);

    const body = await req.json().catch(() => null);
    const kind = body?.kind;
    const absenceIds = Array.isArray(body?.absenceIds) ? body.absenceIds.filter((d: unknown) => typeof d === "string") : [];
    const decision = body?.decision;
    const note = typeof body?.note === "string" ? body.note : "";

    if (kind !== "VACATION_PERIOD" && kind !== "VACATION_CANCEL" && kind !== "ABSENCE") {
      return NextResponse.json({ error: "Tipo de pedido inválido." }, { status: 400 });
    }
    if (absenceIds.length === 0) {
      return NextResponse.json({ error: "Nenhum pedido identificado." }, { status: 400 });
    }
    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return NextResponse.json({ error: "Decisão inválida." }, { status: 400 });
    }

    const formData = new FormData();
    formData.set("decisionNote", note);

    const result =
      kind === "ABSENCE"
        ? await decideAbsence(absenceIds[0], decision, formData, approver)
        : await decideVacationPeriod(absenceIds, decision, formData, approver);

    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
