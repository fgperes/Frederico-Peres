"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/confirm-dialog";
import { deleteIrsBracket } from "../actions";

export function DeleteIrsBracketButton({ bracketId, order }: { bracketId: string; order: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  async function handleClick() {
    if (!(await confirm(`Tem a certeza que quer remover o escalão nº ${order}?`))) return;
    startTransition(async () => {
      await deleteIrsBracket(bracketId);
      router.refresh();
    });
  }

  return (
    <>
      {dialog}
      <button type="button" disabled={pending} onClick={handleClick} className="text-xs text-rose-600 hover:underline disabled:opacity-60">
        {pending ? "a remover..." : "remover"}
      </button>
    </>
  );
}
