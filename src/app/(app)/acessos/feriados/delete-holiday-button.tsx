"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useConfirm } from "@/components/confirm-dialog";
import { deleteHoliday } from "./actions";

export function DeleteHolidayButton({ holidayId, description }: { holidayId: string; description: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  async function handleClick() {
    if (!(await confirm(`Tem a certeza que quer remover o feriado "${description}"?`))) return;
    startTransition(async () => {
      await deleteHoliday(holidayId);
      router.refresh();
    });
  }

  return (
    <>
      {dialog}
      <Button variant="danger" type="button" disabled={pending} onClick={handleClick} className="px-2.5 py-1 text-xs">
        {pending ? "A remover..." : "Remover"}
      </Button>
    </>
  );
}
