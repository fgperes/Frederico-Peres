"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/roles";
import { updateUserRoles } from "./actions";
import { SaveBanner, useSaveFeedback } from "@/components/save-banner";

export function UserRolesForm({
  userId,
  currentRoles,
  currentDepartmentId,
  departments,
  roles,
}: {
  userId: string;
  currentRoles: Role[];
  currentDepartmentId: string | null;
  departments: { id: string; name: string }[];
  roles: { key: Role; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const { status, message, run } = useSaveFeedback();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Lê o FormData e previne o submit nativo em vez de passar handleSubmit
    // como `action` do <form> — com a Actions API do React, um `action`
    // (função) que termina com sucesso repõe os campos não controlados
    // (defaultValue/defaultChecked) ao valor que tinham quando o formulário
    // montou, o que fazia o Âmbito voltar à opção por omissão logo após
    // "Guardar perfis", apesar de já ter sido gravado na BD (só aparecia
    // correto depois de um reload completo da página, que remonta o
    // formulário com o novo currentDepartmentId).
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      run(async () => {
        await updateUserRoles(userId, formData);
        router.refresh();
      }, "Perfis atualizados com sucesso.");
    });
  }

  return (
    <div className="space-y-2">
      <SaveBanner status={status} message={message} />
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="grid grid-cols-1 gap-1">
          {roles.map((role) => (
            <label key={role.key} className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
              <input
                type="checkbox"
                name="roles"
                value={role.key}
                defaultChecked={currentRoles.includes(role.key)}
                className="rounded border-stone-300 dark:border-stone-700"
              />
              {role.label}
            </label>
          ))}
        </div>
        <select
          name="departmentId"
          defaultValue={currentDepartmentId ?? ""}
          className="w-full rounded-md border border-stone-300 px-2 py-1 text-xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
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
          disabled={pending}
          className="rounded-md bg-stone-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-stone-900 disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-700"
        >
          {pending ? "A guardar..." : "Guardar perfis"}
        </button>
      </form>
    </div>
  );
}
