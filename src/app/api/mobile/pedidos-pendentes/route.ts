import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { getVacationType, groupIntoPeriods, CANCEL_REQUEST_MARKER, type VacationDayRow } from "@/lib/vacation";

// Lista os pedidos de férias/ausências do PRÓPRIO utilizador que ainda
// aguardam decisão — nunca os de outros colaboradores. A app mobile nunca
// expõe funcionalidades de gestão (ver src/lib/mobile/current-user.ts): a
// única ação possível aqui é cancelar o próprio pedido, não aprovar/rejeitar
// pedidos de terceiros — isso continua a ser feito apenas na ferramenta web.
type PendingItem = {
  key: string;
  kind: "VACATION_PENDING" | "VACATION_CANCEL" | "ABSENCE";
  typeLabel: string;
  startDate: string;
  endDate: string;
  days: number;
  dates: string[];
  absenceId: string | null;
};

export async function GET(req: Request) {
  try {
    const user = await requireMobileUser(req);
    if (!user.employeeId) return NextResponse.json({ items: [] });

    const items: PendingItem[] = [];

    const vacationType = await getVacationType().catch(() => null);
    if (vacationType) {
      const pending = await prisma.absence.findMany({
        where: {
          employeeId: user.employeeId,
          absenceTypeId: vacationType.id,
          OR: [{ status: "PENDING" }, { status: "APPROVED", reason: CANCEL_REQUEST_MARKER }],
        },
        orderBy: { startDate: "asc" },
      });

      const dateById = new Map(pending.map((a) => [a.id, a.startDate.toISOString()]));
      const rows: VacationDayRow[] = pending.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        employeeName: "",
        date: a.startDate,
        status: a.status,
        reason: a.reason,
      }));

      for (const p of groupIntoPeriods(rows)) {
        items.push({
          key: `vacation-${p.startDate.toISOString()}`,
          kind: p.kind === "CANCEL_PENDING" ? "VACATION_CANCEL" : "VACATION_PENDING",
          typeLabel: p.kind === "CANCEL_PENDING" ? "Pedido de cancelamento de férias" : "Pedido de férias",
          startDate: p.startDate.toISOString(),
          endDate: p.endDate.toISOString(),
          days: p.absenceIds.length,
          dates: p.absenceIds.map((id) => dateById.get(id)!).filter(Boolean),
          absenceId: null,
        });
      }
    }

    const pendingAbsences = await prisma.absence.findMany({
      where: { employeeId: user.employeeId, status: "PENDING", absenceType: { isVacation: false } },
      include: { absenceType: true },
      orderBy: { startDate: "asc" },
    });

    for (const a of pendingAbsences) {
      items.push({
        key: `absence-${a.id}`,
        kind: "ABSENCE",
        typeLabel: a.absenceType.name,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate.toISOString(),
        days: a.days,
        dates: [],
        absenceId: a.id,
      });
    }

    items.sort((a, b) => a.startDate.localeCompare(b.startDate));

    return NextResponse.json({ items });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
