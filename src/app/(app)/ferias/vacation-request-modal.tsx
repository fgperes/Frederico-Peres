"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";
import { getMonthStart, getMonthDays, isoDate, addMonthsIso } from "@/lib/dates";
import { toggleVacationDays } from "./actions";
import type { DayMark } from "./calendar";
import type { VacationHeadcount } from "@/lib/vacation";

// Modal de marcação de férias ao estilo da modal "Criar turno" em Escalas:
// em vez de clicar dia a dia diretamente no calendário, o colaborador (ou
// gestor) escolhe um período de até um mês, seleciona vários dias de uma
// vez e guarda tudo junto. Clicar num dia já marcado inclui-o no pedido de
// alteração (cancelar pendente / pedir cancelamento de aprovado) — a mesma
// lógica por dia que o calendário sempre teve, só a interação é que muda.
export function VacationRequestModal({
  open,
  onClose,
  employeeId,
  employeeName,
  isSelf,
  initialMonthIso,
  initialSelectedIso,
  marks,
  headcount,
  planned,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  isSelf: boolean;
  initialMonthIso: string;
  initialSelectedIso?: string;
  marks: Record<string, DayMark>;
  headcount: VacationHeadcount;
  planned: number;
}) {
  // `marks` só cobre o ano do calendário de origem — a navegação fica presa
  // a esse ano para nunca mostrar um mês sem o estado real marcado.
  const boundYear = getMonthStart(initialMonthIso).getFullYear();
  const router = useRouter();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function initialSelection(): Set<string> {
    if (!initialSelectedIso) return new Set();
    const d = new Date(`${initialSelectedIso}T00:00:00`);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isPast = isSelf && d < today;
    return isWeekend || isPast ? new Set() : new Set([initialSelectedIso]);
  }

  const [monthIso, setMonthIso] = useState(initialMonthIso);
  const [selected, setSelected] = useState<Set<string>>(initialSelection());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A modal não é desmontada entre aberturas (fica sempre no DOM, só o
  // `open` do componente Modal interno muda) — ao reabrir com um dia ou mês
  // diferente (ex.: clicar noutro dia do calendário), sincroniza o estado
  // para esse novo ponto de partida, em vez de manter a seleção anterior.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMonthIso(initialMonthIso);
      setSelected(initialSelection());
      setError(null);
    }
  }

  const monthStart = getMonthStart(monthIso);
  const days = getMonthDays(monthStart);

  function toggleDay(iso: string, disabled: boolean) {
    if (disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  function shiftMonth(dir: 1 | -1) {
    const next = addMonthsIso(monthIso, dir);
    if (getMonthStart(next).getFullYear() !== boundYear) return;
    setMonthIso(next);
  }

  const atFirstMonth = monthStart.getMonth() === 0;
  const atLastMonth = monthStart.getMonth() === 11;

  function handleClose() {
    setSelected(new Set());
    setError(null);
    onClose();
  }

  function handleSubmit() {
    if (selected.size === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await toggleVacationDays(employeeId, Array.from(selected));
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result.updated) {
        setError(result.failed?.[0]?.error ?? "Não foi possível marcar os dias selecionados.");
        return;
      }
      if (result.failed && result.failed.length > 0) {
        setError(`${result.updated} dia(s) atualizado(s). Falhou: ${result.failed.map((f) => f.date).join(", ")}.`);
      }
      router.refresh();
      setSelected(new Set());
      if (!result.failed || result.failed.length === 0) onClose();
    });
  }

  const newSelections = Array.from(selected).filter((iso) => !marks[iso]).length;
  const projectedAvailable = headcount.saldo - newSelections;

  return (
    <Modal open={open} onClose={handleClose} title="Marcar férias" widthClassName="max-w-xl">
      <div className="space-y-4">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Colaborador: <span className="font-medium text-stone-900 dark:text-stone-100">{employeeName}</span>
        </p>

        {initialSelectedIso && (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Pode desmarcar este dia ou escolher outro dia livre em alternativa antes de guardar.
          </p>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
              Período (clique nos dias para marcar ou desmarcar)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={atFirstMonth}
                className="rounded-md border border-stone-300 p-1 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="w-32 text-center text-sm font-medium capitalize text-stone-900 dark:text-stone-100">
                {monthStart.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                disabled={atLastMonth}
                className="rounded-md border border-stone-300 p-1 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const iso = isoDate(d);
              const mark = marks[iso];
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isPast = isSelf && d < today;
              const disabled = isWeekend || isPast;
              const checked = selected.has(iso);

              let chipClass: string;
              if (disabled) {
                chipClass = "cursor-not-allowed border-stone-100 text-stone-300 dark:border-stone-800 dark:text-stone-700";
              } else if (checked) {
                chipClass =
                  "cursor-pointer border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-500 dark:border-violet-500 dark:bg-violet-500/10 dark:text-violet-300";
              } else if (mark?.status === "APPROVED") {
                chipClass =
                  "cursor-pointer border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
              } else if (mark?.status === "PENDING") {
                chipClass =
                  "cursor-pointer border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
              } else if (mark?.status === "CANCEL_PENDING") {
                chipClass =
                  "cursor-pointer border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-500/10 dark:text-orange-300";
              } else {
                chipClass =
                  "cursor-pointer border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800";
              }

              return (
                <label
                  key={iso}
                  title={mark?.title}
                  className={`flex flex-col items-center rounded-md border px-1 py-1.5 text-center text-xs ${chipClass}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleDay(iso, disabled)}
                    className="sr-only"
                  />
                  {d.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", "")}
                  <span className="font-semibold">{d.toLocaleDateString("pt-PT", { day: "2-digit" })}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-lg border border-stone-200 p-3 dark:border-stone-800">
          <Stat label="Aprovados" value={headcount.approved} />
          <Stat label="Por marcar" value={planned} />
          <Stat label="Disponíveis" value={projectedAvailable} highlight={projectedAvailable < 0} />
        </div>

        {error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending || selected.size === 0}>
            {pending ? "A guardar..." : "Guardar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          highlight ? "text-rose-600 dark:text-rose-400" : "text-stone-900 dark:text-stone-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
