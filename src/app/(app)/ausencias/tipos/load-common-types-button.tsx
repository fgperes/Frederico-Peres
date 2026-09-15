"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { loadCommonAbsenceTypes } from "../actions";
import { Button } from "@/components/ui";

export function LoadCommonTypesButton() {
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const r = await loadCommonAbsenceTypes();
      setResult(r);
      router.refresh();
    });
  }

  return (
    <div>
      <Button variant="secondary" onClick={handleClick} disabled={pending}>
        <Download size={14} />
        {pending ? "A carregar..." : "Carregar tipos comuns"}
      </Button>
      {result && (
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          {result.created} tipo(s) criado(s), {result.skipped} já existiam.
        </p>
      )}
    </div>
  );
}
