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

  function handleSubmit(formData: FormData) {
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
      <form action={handleSubmit} className="space-y-2">
        <div className="grid grid-cols-1 gap-1">
          {roles.map((role) => (
            <label key={role.key} className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
              <input
                type="checkbox"
                name="roles"
                value={role.key}
                defaultChecked={currentRoles.includes(role.key)}
                className="rounded border-stone-300"
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
