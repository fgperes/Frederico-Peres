"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelAbsence } from "./actions";
import { SaveBanner, useSaveFeedback } from "@/components/save-banner";

export function CancelAbsenceButton({ absenceId }: { absenceId: string }) {
  const [pending, startTransition] = useTransition();
  const { status, message, run } = useSaveFeedback();
  const router = useRouter();

  function handleClick() {
    startTransition(() => {
      run(async () => {
        const result = await cancelAbsence(absenceId);
        if (result.error) throw new Error(result.error);
        router.refresh();
      }, "Pedido cancelado.");
    });
  }

  return (
    <div>
      {status === "error" && <SaveBanner status={status} message={message} />}
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className="mt-1 text-xs text-rose-600 hover:underline disabled:opacity-60"
      >
        {pending ? "a cancelar..." : "cancelar"}
      </button>
    </div>
  );
}
