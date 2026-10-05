"use client";

import { useState, useTransition } from "react";
import { Calculator } from "lucide-react";
import { generatePayslipAction } from "@/app/(app)/payroll/actions";
import { useConfirm } from "@/components/confirm-dialog";

export function GeneratePayslipButton({
  employeeId,
  year,
  month,
  label,
  isRegenerate = false,
}: {
  employeeId: string;
  year: number;
  month: number;
  label: string;
  isRegenerate?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  async function handleClick() {
    if (isRegenerate) {
      const ok = await confirm(
        "Tem a certeza que quer gerar este recibo novamente? Os valores atuais serão recalculados e substituídos — fica registada a data e o utilizador desta regeneração.",
        { confirmLabel: "Gerar novamente", variant: "primary" }
      );
      if (!ok) return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("employeeId", employeeId);
      formData.set("year", String(year));
      formData.set("month", String(month));
      const result = await generatePayslipAction({}, formData);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      {dialog}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        <Calculator size={15} />
        {pending ? "A calcular..." : label}
      </button>
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
