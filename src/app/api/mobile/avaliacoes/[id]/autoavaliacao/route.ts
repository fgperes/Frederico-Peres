import { NextResponse } from "next/server";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { submitEvaluationAnswers, type AnswerInput } from "@/app/(app)/colaboradores/[id]/avaliacoes/actions";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireMobileUser(req);
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const rawAnswers: unknown[] = Array.isArray(body?.answers) ? body.answers : [];
    const answers: AnswerInput[] = rawAnswers
      .filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null)
      .map((a): AnswerInput => ({
        questionId: String(a.questionId ?? ""),
        rawValue: typeof a.rawValue === "number" ? a.rawValue : undefined,
        selectedOptionId: typeof a.selectedOptionId === "string" ? a.selectedOptionId : undefined,
        textValue: typeof a.textValue === "string" ? a.textValue : undefined,
      }))
      .filter((a): boolean => a.questionId.length > 0);

    const result = await submitEvaluationAnswers(id, "SELF", answers, user);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
