"use client";

import { useActionState } from "react";
import Link from "next/link";
import { generatePredictiveProposalAction, type PredictiveState } from "./actions";
import type { Department } from "@prisma/client";

const initialState: PredictiveState = {};

export function PredictiveForm({ departments }: { departments: Department[] }) {
  const [state, formAction, pending] = useActionState(
    generatePredictiveProposalAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Semana (qualquer data dessa semana)
        </label>
        <input name="week" type="date" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Departamento</label>
        <select name="departmentId" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todos</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Capacidade de atendimento por colaborador (unid. de procura)
        </label>
        <input name="capacityPerEmployee" type="number" defaultValue={10} min={1} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "A gerar proposta..." : "Gerar Proposta (simulação)"}
      </button>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}

      {state.result && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
          <p className="mb-2 font-medium text-slate-800">
            {state.result.createdShifts} turnos criados em modo rascunho.
          </p>
          {state.result.windows.length > 0 && (
            <table className="w-full text-left">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1">Dia</th>
                  <th className="py-1">Turno</th>
                  <th className="py-1">Necessário</th>
                  <th className="py-1">Atribuído</th>
                </tr>
              </thead>
              <tbody>
                {state.result.windows.map((w, i) => (
                  <tr key={i} className={w.assigned < w.required ? "text-amber-700" : "text-slate-700"}>
                    <td className="py-1">{w.day}</td>
                    <td className="py-1">{w.window}</td>
                    <td className="py-1">{w.required}</td>
                    <td className="py-1">{w.assigned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Link href="/horarios" className="mt-2 inline-block text-blue-700 hover:underline">
            Rever e ajustar no horário manual →
          </Link>
        </div>
      )}
    </form>
  );
}
