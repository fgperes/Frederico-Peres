import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";

export async function GET(req: Request) {
  try {
    const user = await requireMobileUser(req);
    if (!user.employeeId) {
      return NextResponse.json({ error: "Conta sem ficha de colaborador associada." }, { status: 404 });
    }

    const evaluations = await prisma.evaluation.findMany({
      where: { employeeId: user.employeeId },
      select: {
        id: true,
        status: true,
        scheduledDate: true,
        selfCompletedAt: true,
        managerCompletedAt: true,
        template: { select: { name: true, hasSelfEvaluation: true } },
      },
      orderBy: { scheduledDate: "desc" },
    });

    return NextResponse.json({ evaluations });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
