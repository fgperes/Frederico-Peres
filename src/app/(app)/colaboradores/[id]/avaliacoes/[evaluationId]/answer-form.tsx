"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { SaveBanner, type SaveStatus } from "@/components/save-banner";
import { submitEvaluationAnswers, type AnswerInput } from "../actions";
import type { Respondent } from "@/lib/evaluations";

type QuestionData = {
  id: string;
  text: string;
  type: "SCALE" | "SINGLE_CHOICE" | "TEXT";
  maxScore: number;
  options: { id: string; label: string; points: number }[];
};

export function AnswerForm({
  evaluationId,
  respondent,
  questions,
}: {
  evaluationId: string;
  respondent: Respondent;
  questions: QuestionData[];
}) {
  const [values, setValues] = useState<Record<string, { score?: number; selectedOptionId?: string; textValue?: string }>>(
    {}
  );
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");

    const answers: AnswerInput[] = questions.map((q) => ({ questionId: q.id, ...values[q.id] }));

    startTransition(async () => {
      try {
        const result = await submitEvaluationAnswers(evaluationId, respondent, answers);
        router.push(`/colaboradores/${result.employeeId}/avaliacoes`);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Ocorreu um erro ao gravar as respostas.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SaveBanner status={status} message={message} />

      {questions.map((q) => (
        <Card key={q.id}>
          <p className="mb-3 text-sm font-medium text-stone-900 dark:text-stone-100">{q.text}</p>

          {q.type === "SCALE" && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={q.maxScore}
                required
                value={values[q.id]?.score ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [q.id]: { score: Number(e.target.value) } }))
                }
                className="w-24 rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
              <span className="text-xs text-stone-500 dark:text-stone-400">/ {q.maxScore} pontos</span>
            </div>
          )}

          {q.type === "SINGLE_CHOICE" && (
            <div className="space-y-1.5">
              {q.options.map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300"
                >
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    required
                    checked={values[q.id]?.selectedOptionId === o.id}
                    onChange={() => setValues((v) => ({ ...v, [q.id]: { selectedOptionId: o.id } }))}
                    className="h-4 w-4 border-stone-300 text-violet-600 focus:ring-violet-500 dark:border-stone-600"
                  />
                  {o.label} <span className="text-xs text-stone-400">({o.points} pts)</span>
                </label>
              ))}
            </div>
          )}

          {q.type === "TEXT" && (
            <textarea
              rows={3}
              value={values[q.id]?.textValue ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [q.id]: { textValue: e.target.value } }))}
              placeholder="Comentário (opcional)"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          )}
        </Card>
      ))}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "A gravar…" : "Guardar avaliação"}
        </Button>
      </div>
    </form>
  );
}
