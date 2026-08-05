"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { createVacationBalanceForYear } from "../../../ferias/actions";
import { SaveBanner, useSaveFeedback } from "@/components/save-banner";

export function CreateYearButton({ employeeId, year }: { employeeId: string; year: number }) {
  const { status, message, run } = useSaveFeedback();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(() => {
      run(async () => {
        await createVacationBalanceForYear(employeeId, year);
        router.refresh();
      }, `Contingente de férias de ${year} criado.`);
    });
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
        <PlusCircle size={15} />
        Criar contingente de {year}
      </button>
    </div>
  );
}
