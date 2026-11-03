"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/confirm-dialog";
import { deleteIrsTable } from "../actions";

export function DeleteIrsTableButton({ tableId, label }: { tableId: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  async function handleClick() {
    if (!(await confirm(`Tem a certeza que quer eliminar a tabela de IRS "${label}" e todos os seus escalões?`))) return;
    startTransition(async () => {
      await deleteIrsTable(tableId);
      router.refresh();
    });
  }

  return (
    <>
      {dialog}
      <button type="button" disabled={pending} onClick={handleClick} className="text-xs text-rose-600 hover:underline disabled:opacity-60">
        {pending ? "a eliminar..." : "eliminar tabela"}
      </button>
    </>
  );
}
