"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { SaveBanner, type SaveStatus } from "@/components/save-banner";
import { submitEvaluationAnswers, type AnswerInput } from "../actions";
import type { Respondent } from "@/lib/evaluations";

type QuestionData = {
  id: string;
  sectionKey: string;
  text: string;
  type: "SCALE" | "SINGLE_CHOICE" | "TEXT";
  maxScore: number;
  scaleMin: number;
  scaleMax: number;
  options: { id: string; label: string; points: number }[];
};

type SectionData = { key: string; title: string };

export function AnswerForm({
  evaluationId,
  respondent,
  sections,
  questions,
}: {
  evaluationId: string;
  respondent: Respondent;
  sections: SectionData[];
  questions: QuestionData[];
}) {
  const [values, setValues] = useState<
    Record<string, { rawValue?: number; selectedOptionId?: string; textValue?: string }>
  >({});
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <SaveBanner status={status} message={message} />

      {sections.map((section) => {
        const sectionQuestions = questions.filter((q) => q.sectionKey === section.key);
        if (sectionQuestions.length === 0) return null;
        return (
          <div key={section.key} className="space-y-4">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{section.title}</h2>
            {sectionQuestions.map((q) => (
              <Card key={q.id}>
                <p className="mb-3 text-sm font-medium text-stone-900 dark:text-stone-100">{q.text}</p>

                {q.type === "SCALE" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={q.scaleMin}
                      max={q.scaleMax}
                      required
                      value={values[q.id]?.rawValue ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [q.id]: { rawValue: Number(e.target.value) } }))
                      }
                      className="w-24 rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                    />
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      (escala {q.scaleMin} a {q.scaleMax} — vale {q.maxScore} pontos no máximo)
                    </span>
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
          </div>
        );
      })}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "A gravar…" : "Guardar avaliação"}
        </Button>
      </div>
    </form>
  );
}
