"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Plane } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { createVacationBalanceForYear } from "../../../ferias/actions";
import { VacationHistoryTable } from "../../../ferias/history-table";
import { SaveBanner, type SaveStatus } from "@/components/save-banner";
import type { VacationHistoryRow } from "@/lib/vacation";

export function FeriasPanel({
  employeeId,
  initialRows,
  canManage,
  currentYear,
}: {
  employeeId: string;
  initialRows: VacationHistoryRow[];
  canManage: boolean;
  currentYear: number;
}) {
  // Linhas criadas nesta sessão que ainda não vieram de volta no
  // `initialRows` do servidor (router.refresh() é assíncrono) — mostradas
  // de imediato para o utilizador ver o contingente logo após o criar, sem
  // ter de sair e voltar a entrar no separador.
  const [optimisticRows, setOptimisticRows] = useState<VacationHistoryRow[]>([]);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const rows = [
    ...initialRows,
    ...optimisticRows.filter((row) => !initialRows.some((r) => r.year === row.year)),
  ].sort((a, b) => b.year - a.year);

  const latestYear = rows.reduce((max, row) => Math.max(max, row.year), currentYear - 1);
  const yearToCreate = latestYear + 1;

  function handleCreate() {
    startTransition(async () => {
      setStatus("idle");
      try {
        const row = await createVacationBalanceForYear(employeeId, yearToCreate);
        setOptimisticRows((prev) => [...prev, row]);
        setStatus("success");
        setMessage(`Contingente de férias de ${yearToCreate} criado.`);
        router.refresh();
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Ocorreu um erro ao criar o contingente.");
      }
    });
  }

  return (
    <div>
      {canManage && (
        <div className="mb-6">
          <SaveBanner status={status} message={message} />
          <button
            type="button"
            disabled={pending}
            onClick={handleCreate}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <PlusCircle size={15} />
            Criar contingente de {yearToCreate}
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Plane} message="Sem contingentes de férias criados para este colaborador." />
        </Card>
      ) : (
        <VacationHistoryTable
          employeeId={employeeId}
          rows={rows}
          canManage={canManage}
          editableYears={(year) => year >= currentYear - 1}
        />
      )}
    </div>
  );
}
