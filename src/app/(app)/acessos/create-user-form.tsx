"use client";

import { useActionState, useState } from "react";
import { createUserAction, type CreateUserState } from "./actions";
import { ROLES, ROLE_LABELS } from "@/lib/roles";
import type { Employee } from "@prisma/client";

const initialState: CreateUserState = {};

export function CreateUserForm({ employees }: { employees: Employee[] }) {
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialState
  );
  const [copied, setCopied] = useState(false);

  return (
    <div>
      {state.success ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm">
          <p className="font-medium text-green-800">
            Utilizador criado com sucesso.
          </p>
          <p className="mt-2 text-slate-700">
            Email: <span className="font-mono">{state.success.email}</span>
          </p>
          <p className="text-slate-700">
            Password temporária:{" "}
            <span className="font-mono font-semibold">
              {state.success.password}
            </span>
          </p>
          <p className="mt-2 text-xs text-amber-700">
            Esta password só é apresentada uma vez. Guarde-a e partilhe-a de
            forma segura — o utilizador terá de a alterar no primeiro login.
          </p>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(state.success!.password);
              setCopied(true);
            }}
            className="mt-2 rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-white"
          >
            {copied ? "Copiado!" : "Copiar password"}
          </button>
        </div>
      ) : (
        <form action={formAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Nome
            </label>
            <input
              name="name"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Associar a colaborador (opcional)
            </label>
            <select
              name="employeeId"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Perfis de acesso
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="roles" value={role} />
                  {ROLE_LABELS[role]}
                </label>
              ))}
            </div>
          </div>

          {state.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? "A criar..." : "Criar utilizador"}
          </button>
        </form>
      )}
    </div>
  );
}
