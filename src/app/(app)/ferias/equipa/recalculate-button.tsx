"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calculator } from "lucide-react";
import { recalculateHireYearEntitlements } from "../actions";
import { SaveBanner, type SaveStatus } from "@/components/save-banner";

export function RecalculateButton() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(() => {
      run();
    });
  }

  async function run() {
    setStatus("idle");
    try {
      const { updated, skipped } = await recalculateHireYearEntitlements();
      setStatus("success");
      setMessage(
        updated > 0
          ? `${updated} saldo(s) do ano de admissão atualizado(s) (${skipped} já estavam corretos).`
          : `Nenhuma alteração necessária — todos os ${skipped} saldos já estavam corretos.`
      );
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Ocorreu um erro ao recalcular.");
    }
  }

  return (
    <div>
      <SaveBanner status={status} message={message} />
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        <Calculator size={15} />
        Recalcular saldos do ano de admissão
      </button>
    </div>
  );
}
