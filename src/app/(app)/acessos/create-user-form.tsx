"use client";

import { useActionState, useState } from "react";
import { createUserAction, type CreateUserState } from "./actions";
import { ROLES, ROLE_LABELS } from "@/lib/roles";
import { SaveBanner } from "@/components/save-banner";

const initialState: CreateUserState = {};

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialState
  );
  const [copied, setCopied] = useState(false);

  return (
    <div>
      {state.success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <p className="font-medium text-emerald-800 dark:text-emerald-400">
            Utilizador criado com sucesso.
          </p>
          <p className="mt-2 text-stone-700 dark:text-stone-300">
            Email: <span className="font-mono">{state.success.email}</span>
          </p>
          <p className="text-stone-700 dark:text-stone-300">
            Password temporária:{" "}
            <span className="font-mono font-semibold">
              {state.success.password}
            </span>
          </p>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            Esta password só é apresentada uma vez. Guarde-a e partilhe-a de
            forma segura — o utilizador terá de a alterar no primeiro login.
          </p>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(state.success!.password);
              setCopied(true);
            }}
            className="mt-2 rounded-md border border-stone-300 px-3 py-1 text-xs hover:bg-white dark:border-stone-700 dark:hover:bg-stone-800"
          >
            {copied ? "Copiado!" : "Copiar password"}
          </button>
        </div>
      ) : (
        <form action={formAction} className="space-y-3">
          <SaveBanner status={state.error ? "error" : "idle"} message={state.error} />
          <p className="rounded-md bg-stone-50 px-3 py-2 text-xs text-stone-600 dark:bg-stone-800/60 dark:text-stone-400">
            Para criar a conta de acesso de um colaborador, faça-o na respetiva
            ficha em Colaboradores. Este formulário é para contas sem ficha de
            colaborador (ex.: integrações, contas de sistema).
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Nome
            </label>
            <input
              name="name"
              required
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Perfis de acesso
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                  <input type="checkbox" name="roles" value={role} className="rounded border-stone-300" />
                  {ROLE_LABELS[role]}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {pending ? "A criar..." : "Criar utilizador"}
          </button>
        </form>
      )}
    </div>
  );
}
