"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui";

export function DeleteSectionButton({
  onDelete,
  confirmMessage,
}: {
  onDelete: () => Promise<{ error?: string }>;
  confirmMessage: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(() => {
      onDelete().then((result) => {
        if (result.error) {
          setError(result.error);
        } else {
          router.push("/estrutura");
        }
      });
    });
  }

  return (
    <div>
      <Button variant="danger" type="button" disabled={pending} onClick={handleClick}>
        <Trash2 size={14} />
        {pending ? "A apagar..." : "Apagar secção"}
      </Button>
      {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
