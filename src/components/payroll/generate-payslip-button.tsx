"use client";

import { useActionState } from "react";
import { Calculator } from "lucide-react";
import { generatePayslipAction, type GeneratePayslipState } from "@/app/(app)/payroll/actions";

const initialState: GeneratePayslipState = {};

export function GeneratePayslipButton({
  employeeId,
  year,
  month,
  label,
}: {
  employeeId: string;
  year: number;
  month: number;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(generatePayslipAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        <Calculator size={15} />
        {pending ? "A calcular..." : label}
      </button>
      {state.error && <p className="mt-2 text-sm text-rose-700">{state.error}</p>}
    </form>
  );
}
