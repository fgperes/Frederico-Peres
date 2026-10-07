"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { AvatarImage } from "@/lib/avatars";
import { useConfirm } from "@/components/confirm-dialog";
import { generatePayslipsBulkAction } from "./actions";

type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  baseSalary: number | null;
  hasPayslip: boolean;
  netTotal: number | null;
  avatarKey: string | null | undefined;
  avatarImage: string | null | undefined;
};

export function PayrollEmployeeTable({
  employees,
  year,
  month,
  canEdit,
}: {
  employees: EmployeeRow[];
  year: number;
  month: number;
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ created: number; failed?: string[] } | null>(null);
  const { confirm, dialog } = useConfirm();

  const allSelected = employees.length > 0 && selected.size === employees.length;
  const anyAlreadyGenerated = employees.some((e) => selected.has(e.id) && e.hasPayslip);

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(employees.map((e) => e.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleGenerate() {
    if (selected.size === 0) return;
    if (anyAlreadyGenerated) {
      const ok = await confirm(
        `${selected.size} colaborador(es) selecionado(s) — alguns já têm recibo gerado para este período. Os valores serão recalculados e substituídos, com data e utilizador registados. Continuar?`,
        { confirmLabel: "Gerar novamente", variant: "primary" }
      );
      if (!ok) return;
    }
    setResult(null);
    startTransition(async () => {
      const res = await generatePayslipsBulkAction([...selected], year, month);
      setResult({ created: res.created ?? 0, failed: res.failed });
    });
  }

  return (
    <div>
      {dialog}
      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/60 px-4 py-3 dark:border-stone-800">
          <label className="flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-400">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => toggleAll(e.target.checked)}
              className="rounded border-stone-300 dark:border-stone-700"
            />
            Selecionar todos ({selected.size} selecionado{selected.size === 1 ? "" : "s"})
          </label>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={selected.size === 0 || pending}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {pending ? "A gerar..." : `Gerar recibos selecionados (${selected.size})`}
          </button>
        </div>
      )}
      {result && (
        <div className="border-b border-stone-200 bg-green-50 px-4 py-2 text-xs text-green-700 dark:border-stone-800 dark:bg-green-500/10 dark:text-green-400">
          {result.created} recibo(s) gerado(s).
          {result.failed && result.failed.length > 0 && ` ${result.failed.length} falhou(aram).`}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 dark:border-stone-800">
            <tr>
              {canEdit && <th className="w-8 px-4 py-3"></th>}
              <th className="px-4 py-3">Colaborador</th>
              <th className="px-4 py-3">Salário base</th>
              <th className="px-4 py-3">Estado do recibo</th>
              <th className="px-4 py-3">Líquido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {employees.map((e) => (
              <tr key={e.id} className="hover:bg-stone-50">
                {canEdit && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(e.id)}
                      onChange={(ev) => toggleOne(e.id, ev.target.checked)}
                      className="rounded border-stone-300 dark:border-stone-700"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <Link
                    href={`/payroll/${e.id}`}
                    className="flex items-center gap-3 font-medium text-violet-700 hover:underline"
                  >
                    <AvatarImage avatarKey={e.avatarKey} avatarImage={e.avatarImage} name={`${e.firstName} ${e.lastName}`} size={28} />
                    {e.firstName} {e.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3">{e.baseSalary ? `${e.baseSalary.toFixed(2)} €` : "—"}</td>
                <td className="px-4 py-3">
                  <Badge color={e.hasPayslip ? "green" : "amber"}>{e.hasPayslip ? "Gerado" : "Por gerar"}</Badge>
                </td>
                <td className="px-4 py-3">{e.netTotal != null ? `${e.netTotal.toFixed(2)} €` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
