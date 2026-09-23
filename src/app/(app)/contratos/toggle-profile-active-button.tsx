"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setContractProfileActive } from "./actions";
import { Button } from "@/components/ui";
import { SaveBanner, useSaveFeedback } from "@/components/save-banner";

export function ToggleProfileActiveButton({ profileId, active }: { profileId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const { status, message, run } = useSaveFeedback();
  const router = useRouter();

  function handleClick() {
    startTransition(() => {
      run(async () => {
        const result = await setContractProfileActive(profileId, !active);
        if (result.error) throw new Error(result.error);
        router.refresh();
      }, active ? "Contrato inativado." : "Contrato reativado.");
    });
  }

  return (
    <div>
      {status === "error" && <SaveBanner status={status} message={message} />}
      <Button variant={active ? "danger" : "secondary"} type="button" disabled={pending} onClick={handleClick}>
        {pending ? "A processar..." : active ? "Inativar" : "Reativar"}
      </Button>
    </div>
  );
}
