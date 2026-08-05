"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ClipboardCheck } from "lucide-react";
import { Card, Badge, EmptyState } from "@/components/ui";
import { SaveBanner, type SaveStatus } from "@/components/save-banner";
import { EvaluationPdfButton, type EvaluationPdfData } from "@/components/evaluations/evaluation-pdf-button";
import { scheduleEvaluation } from "./actions";

export type EvaluationRow = {
  id: string;
  templateId: string;
  templateName: string;
  hasSelfEvaluation: boolean;
  scheduledDate: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  managerPercent: number | null;
  managerConsequence: string | null;
  managerCompletedAt: string | null;
  selfCompletedAt: string | null;
  selfPercent: number | null;
  managerPdfData?: EvaluationPdfData | null;
  selfPdfData?: EvaluationPdfData | null;
};

export function AvaliacoesPanel({
  employeeId,
  initialEvaluations,
  eligibleTemplates,
  canManageEvals,
  isSelf,
}: {
  employeeId: string;
  initialEvaluations: EvaluationRow[];
  eligibleTemplates: { id: string; name: string }[];
  canManageEvals: boolean;
  isSelf: boolean;
}) {
  const [optimisticRows, setOptimisticRows] = useState<EvaluationRow[]>([]);
  const [templateId, setTemplateId] = useState(eligibleTemplates[0]?.id ?? "");
  const [scheduledDate, setScheduledDate] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const evaluations = [
    ...initialEvaluations,
    ...optimisticRows.filter((r) => !initialEvaluations.some((e) => e.id === r.id)),
  ].sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId || !scheduledDate) return;
    setStatus("idle");
    startTransition(async () => {
      try {
        const result = await scheduleEvaluation(employeeId, templateId, scheduledDate);
        setOptimisticRows((prev) => [
          ...prev,
          {
            id: result.id,
            templateId: result.templateId,
            templateName: result.templateName,
            hasSelfEvaluation: result.hasSelfEvaluation,
            scheduledDate: result.scheduledDate,
            status: "SCHEDULED",
            managerPercent: null,
            managerConsequence: null,
            managerCompletedAt: null,
            selfCompletedAt: null,
            selfPercent: null,
          },
        ]);
        setStatus("success");
        setMessage(`Avaliação agendada para ${new Date(result.scheduledDate).toLocaleDateString("pt-PT")}.`);
        setScheduledDate("");
        router.refresh();
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Ocorreu um erro ao agendar a avaliação.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {canManageEvals && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
            Agendar nova avaliação
          </h2>
          <SaveBanner status={status} message={message} />
          {eligibleTemplates.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Sem modelos de avaliação atribuídos a este colaborador (nem à sua equipa). Crie ou atribua
              um modelo em Avaliações de Desempenho.
            </p>
          ) : (
            <form onSubmit={handleSchedule} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                  Modelo
                </label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                >
                  {eligibleTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                  Data agendada
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              >
                <Plus size={15} /> Agendar
              </button>
            </form>
          )}
        </Card>
      )}

      {evaluations.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardCheck} message="Sem avaliações de desempenho para este colaborador." />
        </Card>
      ) : (
        <div className="space-y-4">
          {evaluations.map((evaluation) => (
            <EvaluationCard
              key={evaluation.id}
              employeeId={employeeId}
              evaluation={evaluation}
              canManageEvals={canManageEvals}
              isSelf={isSelf}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EvaluationCard({
  employeeId,
  evaluation,
  canManageEvals,
  isSelf,
}: {
  employeeId: string;
  evaluation: EvaluationRow;
  canManageEvals: boolean;
  isSelf: boolean;
}) {
  const dateLabel = new Date(evaluation.scheduledDate).toLocaleDateString("pt-PT");
  const isCompleted = evaluation.status === "COMPLETED";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{evaluation.templateName}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">Agendada para {dateLabel}</p>
        </div>
        <Badge color={isCompleted ? "green" : "amber"}>{isCompleted ? "Concluída" : "Agendada"}</Badge>
      </div>

      {isCompleted && (
        <div className="mt-3 rounded-lg bg-stone-50 p-3 text-sm dark:bg-stone-800/60">
          <p className="font-medium text-stone-900 dark:text-stone-100">
            Resultado: {evaluation.managerPercent}%
          </p>
          <p className="mt-0.5 text-stone-600 dark:text-stone-300">
            {evaluation.managerConsequence ?? "Sem consequência definida para este resultado."}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canManageEvals && !isCompleted && (
          <Link
            href={`/colaboradores/${employeeId}/avaliacoes/${evaluation.id}/preencher`}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
          >
            Preencher avaliação
          </Link>
        )}
        {evaluation.managerPdfData && <EvaluationPdfButton data={evaluation.managerPdfData} />}
      </div>

      {evaluation.hasSelfEvaluation && (
        <div className="mt-4 border-t border-stone-100 pt-3 dark:border-stone-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Autoavaliação
          </p>
          {evaluation.selfCompletedAt ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="green">
                Concluída{evaluation.selfPercent !== null ? ` — ${evaluation.selfPercent}%` : ""}
              </Badge>
              {evaluation.selfPdfData && <EvaluationPdfButton data={evaluation.selfPdfData} />}
            </div>
          ) : isSelf ? (
            <Link
              href={`/colaboradores/${employeeId}/avaliacoes/${evaluation.id}/autoavaliacao`}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Preencher autoavaliação
            </Link>
          ) : (
            <Badge color="slate">Por preencher</Badge>
          )}
        </div>
      )}
    </Card>
  );
}
