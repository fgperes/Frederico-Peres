"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/modal";
import { Badge, Button } from "@/components/ui";
import {
  decideTimeClockDayAction,
  removeTimeClockDecisionAction,
  listJustifiableAbsencesAction,
  type TimeClockDecisionChoice,
  type JustifiableAbsence,
} from "./actions";

const DECISION_LABELS: Record<string, string> = {
  DEDUCTION: "Desconto",
  POOL: "Bolsa de horas",
  JUSTIFIED: "Justificado",
  OVERTIME: "Hora extra",
};

export type ExistingDecision = { decisionType: string } | null;

export function TimeClockDecisionCell({
  employeeId,
  date,
  diffMinutes,
  diffHours,
  existingDecision,
}: {
  employeeId: string;
  date: string;
  diffMinutes: number;
  diffHours: number;
  existingDecision: ExistingDecision;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-center gap-1.5">
      <Badge color={diffHours >= 0 ? "green" : "red"}>
        {diffHours >= 0 ? "+" : ""}
        {diffHours.toFixed(1)}h
      </Badge>
      {existingDecision && (
        <Badge color="blue">{DECISION_LABELS[existingDecision.decisionType] ?? existingDecision.decisionType}</Badge>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={existingDecision ? "Alterar decisão" : "Este dia precisa de decisão"}
        className={
          existingDecision
            ? "text-stone-300 hover:text-violet-600 dark:hover:text-violet-400"
            : "text-amber-500 hover:text-amber-600"
        }
      >
        <AlertTriangle size={13} />
      </button>

      {open && (
        <DecisionModal
          employeeId={employeeId}
          date={date}
          diffMinutes={diffMinutes}
          existingDecision={existingDecision}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function DecisionModal({
  employeeId,
  date,
  diffMinutes,
  existingDecision,
  onClose,
}: {
  employeeId: string;
  date: string;
  diffMinutes: number;
  existingDecision: ExistingDecision;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"menu" | "justify">("menu");
  const [absences, setAbsences] = useState<JustifiableAbsence[]>([]);
  const [loadingAbsences, setLoadingAbsences] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const diffHours = diffMinutes / 60;
  const sign = diffHours >= 0 ? "+" : "";

  function decide(choice: TimeClockDecisionChoice, absenceId?: string) {
    setError(null);
    startTransition(async () => {
      const result = await decideTimeClockDayAction(employeeId, date, choice, absenceId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  function openJustify() {
    setStep("justify");
    setError(null);
    setLoadingAbsences(true);
    startTransition(async () => {
      try {
        const result = await listJustifiableAbsencesAction(employeeId, date);
        setAbsences(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar ausências.");
      } finally {
        setLoadingAbsences(false);
      }
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        await removeTimeClockDecisionAction(employeeId, date);
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao remover decisão.");
      }
    });
  }

  return (
    <Modal open onClose={onClose} title="Decidir desvio de picagens" widthClassName="max-w-sm">
      <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
        Dia {new Date(`${date}T12:00:00`).toLocaleDateString("pt-PT")} · desvio{" "}
        <span className={diffHours >= 0 ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold text-rose-600 dark:text-rose-400"}>
          {sign}
          {diffHours.toFixed(2)}h
        </span>
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </p>
      )}

      {step === "menu" ? (
        <div className="space-y-2">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => decide("INJUSTIFY")}
            className="w-full justify-center"
          >
            Injustificar
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={openJustify}
            className="w-full justify-center"
          >
            Justificar
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => decide("POOL")}
            className="w-full justify-center"
          >
            Colocar para bolsa de horas
          </Button>
          {diffMinutes > 0 && (
            <Button
              disabled={pending}
              onClick={() => decide("OVERTIME")}
              className="w-full justify-center"
            >
              Justificar como hora extra
            </Button>
          )}
          {existingDecision && (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="w-full pt-1 text-center text-xs text-rose-600 hover:underline disabled:opacity-60 dark:text-rose-400"
            >
              Remover decisão atual ({DECISION_LABELS[existingDecision.decisionType] ?? existingDecision.decisionType})
            </button>
          )}
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setStep("menu")}
            className="mb-3 text-xs font-medium text-violet-700 hover:underline dark:text-violet-400"
          >
            ← Voltar
          </button>
          {loadingAbsences ? (
            <p className="py-6 text-center text-sm text-stone-500 dark:text-stone-400">A carregar...</p>
          ) : absences.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-500 dark:text-stone-400">
              Sem ausências aprovadas nesta data.
            </p>
          ) : (
            <ul className="space-y-2">
              {absences.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => decide("JUSTIFY", a.id)}
                    className="flex w-full items-center justify-between rounded-md border border-stone-200 px-3 py-2 text-left text-sm hover:border-violet-400 hover:bg-violet-50 disabled:opacity-60 dark:border-stone-700 dark:hover:bg-violet-500/10"
                  >
                    <span className="font-medium text-stone-800 dark:text-stone-200">{a.typeName}</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {a.startDate} a {a.endDate}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
