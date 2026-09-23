"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteContractType } from "../actions";
import { Button } from "@/components/ui";
import { SaveBanner, useSaveFeedback } from "@/components/save-banner";

export function DeleteContractTypeButton({ contractTypeId }: { contractTypeId: string }) {
  const [pending, startTransition] = useTransition();
  const { status, message, run } = useSaveFeedback();
  const router = useRouter();

  function handleClick() {
    startTransition(() => {
      run(async () => {
        const result = await deleteContractType(contractTypeId);
        if (result.error) throw new Error(result.error);
        router.refresh();
      }, "Tipo de contrato removido.");
    });
  }

  return (
    <div>
      {status === "error" && <SaveBanner status={status} message={message} />}
      <Button variant="danger" type="button" disabled={pending} onClick={handleClick} className="px-2.5 py-1 text-xs">
        {pending ? "A remover..." : "Remover"}
      </Button>
    </div>
  );
}
