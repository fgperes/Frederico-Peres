"use client";

import { useState, useTransition } from "react";
import { Mail, Check } from "lucide-react";
import { Button } from "@/components/ui";
import { sendPayslipEmailAction } from "@/app/(app)/payroll/actions";

export function SendPayslipEmailButton({
  employeeId,
  year,
  month,
}: {
  employeeId: string;
  year: number;
  month: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await sendPayslipEmailAction(employeeId, year, month);
      if (result.error) {
        setError(result.error);
      } else {
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      }
    });
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={pending} variant="secondary">
        {sent ? <Check size={15} /> : <Mail size={15} />}
        {pending ? "A enviar..." : sent ? "Enviado" : "Enviar por email"}
      </Button>
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
