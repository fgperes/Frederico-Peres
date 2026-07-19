"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideVacationPeriod } from "../actions";
import { SaveBanner, useSaveFeedback } from "@/components/save-banner";

export function ApprovalActions({ absenceIds }: { absenceIds: string[] }) {
  const [pending, startTransition] = useTransition();
  const { status, message, run } = useSaveFeedback();
  const [note, setNote] = useState("");
  const router = useRouter();

  function decide(decision: "APPROVED" | "REJECTED") {
    startTransition(() => {
      run(async () => {
        const formData = new FormData();
        formData.set("decisionNote", note);
        await decideVacationPeriod(absenceIds, decision, formData);
        router.refresh();
      }, decision === "APPROVED" ? "Período aprovado com sucesso." : "Período rejeitado.");
    });
  }

  return (
    <div>
      <SaveBanner status={status} message={message} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          className="rounded-md border border-stone-300 px-2 py-1 text-xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("APPROVED")}
          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          Aprovar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("REJECTED")}
          className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60"
        >
          Rejeitar
        </button>
      </div>
    </div>
  );
}
