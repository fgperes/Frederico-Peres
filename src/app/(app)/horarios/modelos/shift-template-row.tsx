"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { updateShiftTemplate, deleteShiftTemplate } from "../actions";

type Template = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMins: number;
  color: string;
};

export function ShiftTemplateRow({
  template,
  canEdit,
  canDelete,
}: {
  template: Template;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateShiftTemplate(template.id, formData);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao guardar.");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Apagar o modelo "${template.name}"? Esta ação não pode ser desfeita.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteShiftTemplate(template.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao apagar.");
      }
    });
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-3">
          <form action={handleSave} className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-stone-600">Nome</label>
              <input
                name="name"
                required
                defaultValue={template.name}
                className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-stone-600">Início</label>
              <input
                name="startTime"
                type="time"
                required
                defaultValue={template.startTime}
                className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-stone-600">Fim</label>
              <input
                name="endTime"
                type="time"
                required
                defaultValue={template.endTime}
                className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-stone-600">Pausa (min)</label>
              <input
                name="breakMins"
                type="number"
                min={0}
                defaultValue={template.breakMins}
                className="w-20 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-stone-600">Cor</label>
              <input
                name="color"
                type="color"
                defaultValue={template.color}
                className="h-9 w-14 rounded-md border border-stone-300"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {pending ? "A guardar…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-white"
            >
              Cancelar
            </button>
            {error && <span className="text-xs text-rose-600">{error}</span>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-4 py-3">
        <span
          className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
          style={{ backgroundColor: template.color }}
        />
        {template.name}
      </td>
      <td className="px-4 py-3">{template.startTime}</td>
      <td className="px-4 py-3">{template.endTime}</td>
      <td className="px-4 py-3">{template.breakMins}</td>
      {canEdit && (
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Editar"
              className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 hover:text-violet-700"
            >
              <Pencil size={14} />
            </button>
            {canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                title="Apagar"
                className="rounded-md p-1.5 text-stone-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
              >
                <Trash2 size={14} />
              </button>
            ) : (
              <span className="px-1.5 text-[11px] text-stone-400" title="Modelo em uso — não pode ser apagado">
                Em uso
              </span>
            )}
          </div>
          {error && <p className="mt-1 text-right text-xs text-rose-600">{error}</p>}
        </td>
      )}
    </tr>
  );
}
