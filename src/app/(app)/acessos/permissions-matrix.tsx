"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CONFIGURABLE_ROLES,
  MODULES,
  MODULE_LABELS,
  ROLE_LABELS,
  type AccessLevel,
  type Module,
  type Role,
} from "@/lib/roles";
import { updateRolePermissions } from "./actions";
import { SaveBanner, useSaveFeedback } from "@/components/save-banner";

const LEVEL_LABELS: Record<AccessLevel, string> = {
  none: "Sem acesso",
  ro: "Consulta",
  rw: "Edição",
  own: "Próprios dados",
};

const LEVEL_SHORT_LABELS: Record<Exclude<AccessLevel, "own">, string> = {
  none: "Nenhum",
  ro: "Consulta",
  rw: "Edição",
};

export function PermissionsMatrix({
  matrix,
  canEdit,
}: {
  matrix: Record<Role, Record<Module, AccessLevel>>;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { status, message, run } = useSaveFeedback();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      run(async () => {
        await updateRolePermissions(formData);
        router.refresh();
      }, "Matriz de acessos guardada com sucesso.");
    });
  }

  return (
    <div>
      <SaveBanner status={status} message={message} />

      {/* key força remontagem quando a matriz muda a seguir a um guardar
          (os <select> usam defaultValue, que só é lido na montagem inicial) */}
      <form key={JSON.stringify(matrix)} action={handleSubmit}>
        <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800">
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-40" />
              {MODULES.map((mod) => (
                <col key={mod} className="w-[112px]" />
              ))}
            </colgroup>
            <thead className="border-b border-stone-200 bg-stone-50/60 text-[11px] uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
              <tr>
                <th className="px-3 py-2.5">Perfil</th>
                {MODULES.map((mod) => (
                  <th key={mod} className="px-1.5 py-2.5 text-center font-medium leading-tight">
                    {MODULE_LABELS[mod]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {CONFIGURABLE_ROLES.map((role) => (
                <tr key={role}>
                  <td className="px-3 py-2 align-middle font-medium text-stone-800 dark:text-stone-200">
                    {ROLE_LABELS[role]}
                  </td>
                  {MODULES.map((mod) => {
                    const isLockedAdminAcessos = role === "ADMIN_SISTEMA" && mod === "acessos";
                    const level = matrix[role][mod];
                    return (
                      <td key={mod} className="px-1.5 py-2 text-center align-middle">
                        {canEdit ? (
                          <select
                            name={`perm_${role}_${mod}`}
                            defaultValue={level === "own" ? "none" : level}
                            disabled={isLockedAdminAcessos}
                            title={
                              isLockedAdminAcessos
                                ? "O Administrador do Sistema mantém sempre acesso a este módulo."
                                : undefined
                            }
                            className="w-full rounded-md border border-stone-300 px-1 py-1 text-[11px] disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                          >
                            <option value="none">{LEVEL_SHORT_LABELS.none}</option>
                            <option value="ro">{LEVEL_SHORT_LABELS.ro}</option>
                            <option value="rw">{LEVEL_SHORT_LABELS.rw}</option>
                          </select>
                        ) : (
                          <span
                            className={
                              level === "rw"
                                ? "text-emerald-700 dark:text-emerald-400"
                                : level === "ro"
                                  ? "text-sky-700 dark:text-sky-400"
                                  : "text-stone-400 dark:text-stone-600"
                            }
                          >
                            {LEVEL_LABELS[level]}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="px-3 py-2 font-medium text-stone-800 dark:text-stone-200">
                  {ROLE_LABELS.COLABORADOR}
                </td>
                <td colSpan={MODULES.length} className="px-3 py-2 text-xs text-stone-500 dark:text-stone-400">
                  Perfil de auto-serviço — acesso apenas aos seus próprios dados. Não é configurável nesta grelha.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {canEdit && (
          <div className="mt-4">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {pending ? "A guardar..." : "Guardar matriz de acessos"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
