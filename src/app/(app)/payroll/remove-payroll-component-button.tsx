"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/confirm-dialog";
import { removePayrollComponent } from "./actions";

export function RemovePayrollComponentButton({
  componentId,
  employeeId,
  componentName,
}: {
  componentId: string;
  employeeId: string;
  componentName: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  async function handleClick() {
    if (!(await confirm(`Tem a certeza que quer remover o componente "${componentName}"?`))) return;
    startTransition(async () => {
      await removePayrollComponent(componentId, employeeId);
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
