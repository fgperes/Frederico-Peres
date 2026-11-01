"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/confirm-dialog";
import { deleteEmployeeDocument } from "./actions";

export function DeleteDocumentButton({
  employeeId,
  documentId,
  documentName,
}: {
  employeeId: string;
  documentId: string;
  documentName: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  async function handleClick() {
    if (!(await confirm(`Tem a certeza que quer eliminar o anexo "${documentName}"?`))) return;
    startTransition(async () => {
      await deleteEmployeeDocument(employeeId, documentId);
      router.refresh();
    });
  }

  return (
    <>
      {dialog}
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        title="Eliminar"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-stone-700 dark:hover:bg-rose-500/10"
      >
        <Trash2 size={14} />
      </button>
    </>
  );
}
