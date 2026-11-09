"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { DateField } from "@/components/date-field";
import { Button, Select, Textarea, Input } from "@/components/ui";
import { createTraining, type SessionInput } from "../actions";

type ModalityOption = { id: string; name: string; active: boolean };
type EntityOption = { id: string; name: string };

type SessionRow = SessionInput & { key: number };

let rowKeySeq = 0;
function emptyRow(): SessionRow {
  return { key: rowKeySeq++, date: "", hours: 0 };
}

export function TrainingModal({
  open,
  onClose,
  modalities,
  entities,
}: {
  open: boolean;
  onClose: () => void;
  modalities: ModalityOption[];
  entities: EntityOption[];
}) {
  const activeModalities = modalities.filter((m) => m.active);
  const [name, setName] = useState("");
  const [modalityId, setModalityId] = useState(activeModalities[0]?.id ?? "");
  const [entityId, setEntityId] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<SessionRow[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const totalHours = rows.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);

  function updateRow(key: number, patch: Partial<SessionRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function resetAndClose() {
    setName("");
    setModalityId(activeModalities[0]?.id ?? "");
    setEntityId("");
    setDescription("");
    setRows([emptyRow()]);
    setError(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createTraining({
        name,
        modalityId,
        entityId: entityId || undefined,
        description: description || undefined,
        sessions: rows.map((r) => ({ date: r.date, hours: Number(r.hours) || 0, notes: r.notes })),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      resetAndClose();
    });
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="Nova formação" widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Nome</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Modalidade</label>
            <Select value={modalityId} onChange={(e) => setModalityId(e.target.value)} required>
              {activeModalities.length === 0 && <option value="">Sem modalidades ativas</option>}
              {activeModalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Entidade parceira (opcional)
            </label>
            <Select value={entityId} onChange={(e) => setEntityId(e.target.value)}>
              <option value="">A definir</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
            Descrição (opcional)
          </label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-stone-600 dark:text-stone-400">
              Cronograma (dias e horas)
            </label>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Total: {totalHours}h
            </span>
          </div>
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.key} className="flex items-end gap-2">
                <DateField
                  value={row.date}
                  onChange={(v) => updateRow(row.key, { date: v })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="Horas"
                  value={row.hours || ""}
                  onChange={(e) => updateRow(row.key, { hours: Number(e.target.value) })}
                  className="w-24"
                />
                <Input
                  placeholder="Notas (opcional)"
                  value={row.notes ?? ""}
                  onChange={(e) => updateRow(row.key, { notes: e.target.value })}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                  className="text-stone-400 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-rose-400"
                  title="Remover sessão"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
          >
            <Plus size={13} /> Adicionar sessão
          </button>
        </div>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={resetAndClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            Criar formação
          </Button>
        </div>
      </form>
    </Modal>
  );
}
