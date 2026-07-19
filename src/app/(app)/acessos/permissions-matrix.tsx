"use client";

import { useState, useTransition } from "react";
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

const LEVEL_LABELS: Record<AccessLevel, string> = {
  none: "Sem acesso",
  ro: "Consulta",
  rw: "Edição",
  own: "Próprios dados",
};

export function PermissionsMatrix({
  matrix,
  canEdit,
}: {
  matrix: Record<Role, Record<Module, AccessLevel>>;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(() => {
      updateRolePermissions(formData).then(() => {
        setSaved(true);
        router.refresh();
      });
    });
  }

  return (
    <div>
      {/* key força remontagem quando a matriz muda a seguir a um guardar
          (os <select> usam defaultValue, que só é lido na montagem inicial) */}
      <form key={JSON.stringify(matrix)} action={handleSubmit}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
              <tr>
                <th className="py-2 pr-3">Perfil</th>
                {MODULES.map((mod) => (
                  <th key={mod} className="px-2 py-2 text-center font-medium">
                    {MODULE_LABELS[mod]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {CONFIGURABLE_ROLES.map((role) => (
                <tr key={role}>
                  <td className="whitespace-nowrap py-2 pr-3 font-medium text-stone-800 dark:text-stone-200">
                    {ROLE_LABELS[role]}
                  </td>
                  {MODULES.map((mod) => {
                    const isLockedAdminAcessos = role === "ADMIN_SISTEMA" && mod === "acessos";
                    const level = matrix[role][mod];
                    return (
                      <td key={mod} className="px-2 py-2 text-center">
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
                            className="w-full rounded-md border border-stone-300 px-1.5 py-1 text-xs disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                          >
                            <option value="none">Sem acesso</option>
                            <option value="ro">Consulta</option>
                            <option value="rw">Edição</option>
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
                <td className="whitespace-nowrap py-2 pr-3 font-medium text-stone-800 dark:text-stone-200">
                  {ROLE_LABELS.COLABORADOR}
                </td>
                <td colSpan={MODULES.length} className="px-2 py-2 text-xs text-stone-500 dark:text-stone-400">
                  Perfil de auto-serviço — acesso apenas aos seus próprios dados. Não é configurável nesta grelha.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {canEdit && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {pending ? "A guardar..." : "Guardar matriz de acessos"}
            </button>
            {saved && !pending && (
              <span className="text-sm text-emerald-700 dark:text-emerald-400">Guardado.</span>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
