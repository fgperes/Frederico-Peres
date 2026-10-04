"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Modal } from "@/components/modal";
import { createAbsenceType, updateAbsenceType, type AbsenceTypeState } from "../actions";
import type { AbsenceType } from "@prisma/client";

const initialState: AbsenceTypeState = {};

// O gatilho (`children`) vem do Server Component que usa esta modal, por
// isso tem de ser um elemento já pronto (JSX, serializável) — nunca uma
// função como prop, que não pode atravessar a fronteira servidor/cliente.
// É este componente, já no cliente, que lhe liga o clique.
export function AbsenceTypeModal({
  absenceType,
  children,
}: {
  absenceType?: AbsenceType;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(absenceType);
  const action = isEdit ? updateAbsenceType.bind(null, absenceType!.id) : createAbsenceType;
  const [state, formAction, pending] = useActionState(action, initialState);

  // Fecha a modal sozinha assim que a transição de guardar termina sem
  // erro — mesmo padrão de ajuste no render usado nas outras modais desta
  // app (evita useEffect para ressincronizar estado derivado de props).
  const [prevPending, setPrevPending] = useState(pending);
  if (pending !== prevPending) {
    setPrevPending(pending);
    if (!pending && prevPending && !state.error) setOpen(false);
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {children}
      </span>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? `Editar: ${absenceType!.name}` : "Novo Tipo de Ausência"}
      >
        <form action={formAction} className="space-y-3">
          {state.error && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
              {state.error}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Nome</label>
            <input
              name="name"
              required
              defaultValue={absenceType?.name ?? ""}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Unidade</label>
            <select
              name="unitType"
              defaultValue={absenceType?.unitType ?? "WORKING_DAYS"}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            >
              <option value="WORKING_DAYS">Dias úteis</option>
              <option value="CALENDAR_DAYS">Dias corridos</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Limite anual (dias)
            </label>
            <input
              name="annualLimitDays"
              type="number"
              step="0.5"
              defaultValue={absenceType?.annualLimitDays ?? ""}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Impacto salarial (% mantido pela entidade empregadora)
            </label>
            <input
              name="salaryImpactPercent"
              type="number"
              min={0}
              max={100}
              step="5"
              defaultValue={absenceType?.salaryImpactPercent ?? 100}
              required
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
            <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
              100 = totalmente pago pela empresa; 0 = sem remuneração da empresa (ex.: subsídio pago
              diretamente pela Segurança Social); um valor intermédio para pagamento parcial.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Código Segurança Social (opcional)
            </label>
            <input
              name="socialSecurityCode"
              placeholder="ex.: F01"
              defaultValue={absenceType?.socialSecurityCode ?? ""}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Exige documento comprovativo
            </label>
            <select
              name="requiresDocument"
              defaultValue={String(absenceType?.requiresDocument ?? false)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            >
              <option value="false">Não exige</option>
              <option value="true">Obrigatório</option>
            </select>
            <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
              Quando obrigatório, um pedido deste tipo só pode ser submetido com um ficheiro anexado.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
            <input type="checkbox" name="affectsBalance" defaultChecked={absenceType?.affectsBalance ?? true} />
            Afeta saldo de dias
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
            <input
              type="checkbox"
              name="countsAgainstHourPool"
              defaultChecked={absenceType?.countsAgainstHourPool ?? false}
            />
            Desconta da bolsa de horas quando aprovada
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {pending ? "A guardar..." : isEdit ? "Guardar alterações" : "Criar tipo"}
          </button>
        </form>
      </Modal>
    </>
  );
}
