"use client";

import { GraduationCap } from "lucide-react";
import { Card, Badge, EmptyState, TableScroll } from "@/components/ui";
import type { TrainingBalances } from "@/lib/training";

type TrainingRow = {
  id: string;
  name: string;
  modalityLabel: string;
  entityName: string | null;
  totalHours: number;
  firstDate: string | null;
  lastDate: string | null;
};

type TrainingAbsenceRow = {
  typeName: string;
  startDate: string;
  endDate: string;
  hours: number;
};

export function FormacaoEmployeePanel({
  balances,
  trainings,
  trainingAbsences,
}: {
  balances: TrainingBalances;
  trainings: TrainingRow[];
  trainingAbsences: TrainingAbsenceRow[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Saldo de horas de formação</h2>
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="flex-1 rounded-lg bg-stone-50 p-4 dark:bg-stone-800/60">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Acumulado ({balances.years.length} ano(s))
            </p>
            <p className="mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-100">
              {balances.accumulatedHours}h <span className="text-sm text-stone-400">/ {balances.accumulatedTarget}h</span>
            </p>
            <Badge color={balances.accumulatedBalance >= 0 ? "green" : "amber"}>
              {balances.accumulatedBalance >= 0 ? "Cumprido" : `Em falta: ${Math.abs(balances.accumulatedBalance)}h`}
            </Badge>
          </div>
        </div>

        {balances.years.length === 0 ? (
          <p className="text-sm text-stone-400 dark:text-stone-500">Sem histórico de anos para calcular saldo.</p>
        ) : (
          <TableScroll>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  <th className="py-2 pr-3">Ano</th>
                  <th className="py-2 pr-3">Formações</th>
                  <th className="py-2 pr-3">Ausências</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Meta</th>
                  <th className="py-2 pr-3">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {balances.years.map((y) => (
                  <tr key={y.year}>
                    <td className="py-2 pr-3 font-medium text-stone-900 dark:text-stone-100">{y.year}</td>
                    <td className="py-2 pr-3 text-stone-600 dark:text-stone-300">{y.hoursFromTrainings}h</td>
                    <td className="py-2 pr-3 text-stone-600 dark:text-stone-300">{y.hoursFromAbsences}h</td>
                    <td className="py-2 pr-3 text-stone-600 dark:text-stone-300">{y.totalHours}h</td>
                    <td className="py-2 pr-3 text-stone-600 dark:text-stone-300">{y.target}h</td>
                    <td className="py-2 pr-3">
                      <Badge color={y.balance >= 0 ? "green" : "amber"}>
                        {y.balance >= 0 ? `+${y.balance}h` : `${y.balance}h`}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Formações</h2>
        {trainings.length === 0 ? (
          <EmptyState icon={GraduationCap} message="Sem formações registadas para este colaborador." />
        ) : (
          <div className="space-y-2">
            {trainings.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2.5 text-sm dark:bg-stone-800/60"
              >
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100">{t.name}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {t.modalityLabel}
                    {t.entityName ? ` · ${t.entityName}` : ""}
                    {t.firstDate &&
                      ` · ${new Date(t.firstDate).toLocaleDateString("pt-PT")}${
                        t.lastDate && t.lastDate !== t.firstDate
                          ? ` a ${new Date(t.lastDate).toLocaleDateString("pt-PT")}`
                          : ""
                      }`}
                  </p>
                </div>
                <Badge color="blue">{t.totalHours}h</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {trainingAbsences.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
            Ausências que contam para formação
          </h2>
          <div className="space-y-2">
            {trainingAbsences.map((a, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2.5 text-sm dark:bg-stone-800/60"
              >
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100">{a.typeName}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {new Date(a.startDate).toLocaleDateString("pt-PT")}
                    {a.endDate !== a.startDate ? ` a ${new Date(a.endDate).toLocaleDateString("pt-PT")}` : ""}
                  </p>
                </div>
                <Badge color="blue">{a.hours}h</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
