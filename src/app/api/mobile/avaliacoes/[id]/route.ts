import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMobileUser(req);
    if (!user.employeeId) {
      return NextResponse.json({ error: "Conta sem ficha de colaborador associada." }, { status: 404 });
    }

    const { id } = await params;
    const evaluation = await prisma.evaluation.findFirst({
      where: { id, employeeId: user.employeeId },
      include: {
        template: {
          include: {
            sections: { orderBy: { order: "asc" } },
            questions: { include: { options: true }, orderBy: { order: "asc" } },
          },
        },
        answers: true,
      },
    });
    if (!evaluation) {
      return NextResponse.json({ error: "Avaliação não encontrada." }, { status: 404 });
    }

    const canSubmitSelf = evaluation.template.hasSelfEvaluation && !evaluation.selfCompletedAt;

    return NextResponse.json({ evaluation, canSubmitSelf });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
