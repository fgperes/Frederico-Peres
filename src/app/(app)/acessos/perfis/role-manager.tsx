"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Pencil, Trash2, X, Check } from "lucide-react";
import { createRole, updateRole, deleteRole } from "./role-actions";
import { SaveBanner, useSaveFeedback } from "@/components/save-banner";

type RoleDefRow = { id: string; key: string; label: string; isSystem: boolean };

export function RoleManager({
  roleDefs,
  roleUserCounts,
}: {
  roleDefs: RoleDefRow[];
  roleUserCounts: Record<string, number>;
}) {
  return (
    <div className="space-y-6">
      <RoleList roleDefs={roleDefs} roleUserCounts={roleUserCounts} />
      <CreateRoleForm />
    </div>
  );
}

function RoleList({
  roleDefs,
  roleUserCounts,
}: {
  roleDefs: RoleDefRow[];
  roleUserCounts: Record<string, number>;
}) {
  const { status, message, run } = useSaveFeedback();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div>
      <SaveBanner status={status} message={message} />
      <div className="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
              <tr>
                <th className="px-4 py-2.5">Perfil</th>
                <th className="px-4 py-2.5">Chave interna</th>
                <th className="px-4 py-2.5">Utilizadores</th>
                <th className="px-4 py-2.5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {roleDefs.map((def) => {
                const count = roleUserCounts[def.key] ?? 0;
                const isEditing = editingId === def.id;

                return (
                  <RoleRow
                    key={def.id}
                    def={def}
                    count={count}
                    isEditing={isEditing}
                    pending={pending}
                    onEdit={() => setEditingId(def.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSaveEdit={(label) => {
                      startTransition(() => {
                        run(async () => {
                          const formData = new FormData();
                          formData.set("label", label);
                          await updateRole(def.id, formData);
                          router.refresh();
                        }, "Perfil atualizado com sucesso.");
                      });
                      setEditingId(null);
                    }}
                    onDelete={() => {
                      startTransition(() => {
                        run(async () => {
                          await deleteRole(def.id);
                          router.refresh();
                        }, "Perfil eliminado com sucesso.");
                      });
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RoleRow({
  def,
  count,
  isEditing,
  pending,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  def: RoleDefRow;
  count: number;
  isEditing: boolean;
  pending: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (label: string) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(def.label);
  const canDelete = !def.isSystem && count === 0;

  return (
    <tr>
      <td className="px-4 py-2.5 align-middle">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full max-w-xs rounded-md border border-stone-300 px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => onSaveEdit(label)}
              className="rounded-md p-1 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
              title="Guardar"
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                setLabel(def.label);
                onCancelEdit();
              }}
              className="rounded-md p-1 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              title="Cancelar"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <span className="font-medium text-stone-900 dark:text-stone-100">{def.label}</span>
        )}
      </td>
      <td className="px-4 py-2.5 align-middle font-mono text-xs text-stone-500 dark:text-stone-400">
        {def.key}
      </td>
      <td className="px-4 py-2.5 align-middle text-stone-600 dark:text-stone-300">{count}</td>
      <td className="px-4 py-2.5 align-middle">
        {!isEditing && (
          <div className="flex items-center gap-1.5">
            {def.isSystem ? (
              <span
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-400 dark:text-stone-600"
                title="Perfil do sistema — o nome e a existência não podem ser alterados."
              >
                <Lock size={12} />
                Perfil do sistema
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex items-center gap-1 rounded-md border border-stone-300 px-2 py-1 text-xs hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
                >
                  <Pencil size={12} />
                  Renomear
                </button>
                <button
                  type="button"
                  disabled={pending || !canDelete}
                  onClick={onDelete}
                  title={
                    count > 0
                      ? `Não é possível eliminar: ${count} utilizador(es) têm este perfil.`
                      : undefined
                  }
                  className="flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <Trash2 size={12} />
                  Eliminar
                </button>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function CreateRoleForm() {
  const [pending, startTransition] = useTransition();
  const { status, message, run } = useSaveFeedback();
  const router = useRouter();
  const [label, setLabel] = useState("");

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      run(async () => {
        await createRole(formData);
        router.refresh();
        setLabel("");
      }, "Perfil criado com sucesso.");
    });
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
        Criar novo perfil
      </h3>
      <SaveBanner status={status} message={message} />
      <form action={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 max-w-xs">
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
            Nome do perfil
          </label>
          <input
            name="label"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex.: Coordenador de Turno"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "A criar..." : "Criar perfil"}
        </button>
      </form>
      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
        O novo perfil aparece de imediato na matriz abaixo, sem acesso a nenhum módulo — atribua o
        acesso necessário depois de o criar.
      </p>
    </div>
  );
}
