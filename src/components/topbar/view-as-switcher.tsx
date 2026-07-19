"use client";

import { useTransition } from "react";
import { Eye, X } from "lucide-react";
import type { Role } from "@/lib/roles";
import { setViewAsRole, clearViewAsRole } from "./view-as-actions";

export function ViewAsSwitcher({
  currentViewAs,
  currentViewAsLabel,
  previewableRoles,
}: {
  currentViewAs: Role | null;
  currentViewAsLabel: string | null;
  previewableRoles: { key: Role; label: string }[];
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(role: string) {
    const formData = new FormData();
    formData.set("role", role);
    startTransition(() => {
      setViewAsRole(formData);
    });
  }

  if (currentViewAs) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/20">
        <Eye size={15} />
        <span>
          A pré-visualizar como <strong>{currentViewAsLabel ?? currentViewAs}</strong>
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => clearViewAsRole())}
          className="ml-1 flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-200 disabled:opacity-60"
        >
          <X size={12} />
          Voltar a Administrador
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Eye size={15} className="text-stone-400" />
      <select
        disabled={pending}
        defaultValue=""
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-600 disabled:opacity-60"
      >
        <option value="">Ver como...</option>
        {previewableRoles.map((role) => (
          <option key={role.key} value={role.key}>
            {role.label}
          </option>
        ))}
      </select>
    </div>
  );
}
