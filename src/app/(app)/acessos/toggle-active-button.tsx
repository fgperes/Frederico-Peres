"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleUserActive } from "./actions";
import { useSaveFeedback } from "@/components/save-banner";
import { AlertCircle } from "lucide-react";

export function ToggleActiveButton({ userId, active }: { userId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const { status, message, run } = useSaveFeedback();
  const router = useRouter();

  function handleClick() {
    startTransition(() => {
      run(async () => {
        await toggleUserActive(userId, !active);
        router.refresh();
      });
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-md border border-stone-300 px-2.5 py-1 text-xs hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:hover:bg-stone-800"
      >
        {pending ? "A processar..." : active ? "Desativar" : "Ativar"}
      </button>
      {status === "error" && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-400">
          <AlertCircle size={11} className="shrink-0" />
          {message}
        </p>
      )}
    </div>
  );
}
