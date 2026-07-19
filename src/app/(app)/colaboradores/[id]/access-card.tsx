"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui";
import type { Role } from "@/lib/roles";
import {
  updateEmployeeUserRoles,
  resetEmployeeUserPassword,
  type ResetPasswordState,
} from "./access-actions";
import { SaveBanner, useSaveFeedback } from "@/components/save-banner";

type UserRoleInfo = { id: string; role: Role; departmentId: string | null; departmentName: string | null };

const initialResetState: ResetPasswordState = {};

export function AccessCard({
  employeeId,
  hasUser,
  userEmail,
  userActive,
  userId,
  userRoles,
  departments,
  canManage,
  roles,
}: {
  employeeId: string;
  hasUser: boolean;
  userEmail: string | null;
  userActive: boolean | null;
  userId: string | null;
  userRoles: UserRoleInfo[];
  departments: { id: string; name: string }[];
  canManage: boolean;
  roles: { key: Role; label: string }[];
}) {
  const boundUpdateRoles = userId
    ? updateEmployeeUserRoles.bind(null, employeeId, userId)
    : undefined;
  const boundResetPassword = userId
    ? resetEmployeeUserPassword.bind(null, employeeId, userId)
    : undefined;

  const [resetState, resetAction, resetPending] = useActionState(
    boundResetPassword ?? (async (s: ResetPasswordState) => s),
    initialResetState
  );
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const [rolesPending, startRolesTransition] = useTransition();
  const rolesFeedback = useSaveFeedback();
  const roleLabels = Object.fromEntries(roles.map((r) => [r.key, r.label]));

  function handleRolesSubmit(formData: FormData) {
    if (!boundUpdateRoles) return;
    startRolesTransition(() => {
      rolesFeedback.run(async () => {
        await boundUpdateRoles(formData);
        router.refresh();
      }, "Perfis atualizados com sucesso.");
    });
  }

  if (!hasUser) {
    return (
      <EmptyState
        icon={ShieldCheck}
        message={
          canManage
            ? "Sem conta de acesso. Marque \"Criar também utilizador de acesso\" na aba Dados para criar uma."
            : "Este colaborador não tem conta de acesso à aplicação."
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{userEmail}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Conta ativa/inativa via botão &quot;Inativar/Reativar&quot; no topo da página.
          </p>
        </div>
        <Badge color={userActive ? "green" : "slate"}>{userActive ? "Ativo" : "Desativado"}</Badge>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Perfis de acesso
        </h3>
        {canManage && boundUpdateRoles ? (
          <form action={handleRolesSubmit} className="space-y-3">
            <SaveBanner status={rolesFeedback.status} message={rolesFeedback.message} />
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {roles.map((role) => (
                <label key={role.key} className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                  <input
                    type="checkbox"
                    name="roles"
                    value={role.key}
                    defaultChecked={userRoles.some((r) => r.role === role.key)}
                    className="rounded border-stone-300"
                  />
                  {role.label}
                </label>
              ))}
            </div>
            <select
              name="departmentId"
              defaultValue={userRoles.find((r) => r.role === "GESTOR_EQUIPA")?.departmentId ?? ""}
              className="w-full rounded-md border border-stone-300 px-2.5 py-1.5 text-xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            >
              <option value="">Âmbito (departamento) p/ Gestor de Equipa</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={rolesPending}
              className="rounded-md bg-violet-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {rolesPending ? "A guardar..." : "Guardar perfis"}
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {userRoles.length === 0 ? (
              <span className="text-sm text-stone-500 dark:text-stone-400">Sem perfis atribuídos.</span>
            ) : (
              userRoles.map((r) => (
                <Badge key={r.id} color="blue">
                  {roleLabels[r.role] ?? r.role}
                  {r.departmentName ? ` · ${r.departmentName}` : ""}
                </Badge>
              ))
            )}
          </div>
        )}
      </div>

      {canManage && boundResetPassword && (
        <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Password
          </h3>
          <SaveBanner status={resetState.error ? "error" : "idle"} message={resetState.error} />
          {resetState.password ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="font-medium text-emerald-800 dark:text-emerald-400">
                Password redefinida — mostrada apenas uma vez:
              </p>
              <p className="mt-1 font-mono font-semibold text-stone-800 dark:text-stone-200">
                {resetState.password}
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resetState.password!);
                  setCopied(true);
                }}
                className="mt-2 rounded-md border border-stone-300 px-2.5 py-1 text-xs hover:bg-white dark:border-stone-700 dark:hover:bg-stone-800"
              >
                {copied ? "Copiado!" : "Copiar password"}
              </button>
            </div>
          ) : (
            <form action={resetAction}>
              <button
                type="submit"
                disabled={resetPending}
                className="flex items-center gap-1.5 rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:hover:bg-stone-800"
              >
                <KeyRound size={14} />
                {resetPending ? "A redefinir..." : "Redefinir password"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
