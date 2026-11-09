"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { Button, Input } from "@/components/ui";
import { setTrainingEnrollments } from "../actions";

export function EnrollModal({
  open,
  onClose,
  trainingId,
  trainingName,
  employees,
  initialEnrolledIds,
}: {
  open: boolean;
  onClose: () => void;
  trainingId: string;
  trainingName: string;
  employees: { id: string; name: string }[];
  initialEnrolledIds: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialEnrolledIds));
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelected(new Set(initialEnrolledIds));
      setSearch("");
      setError(null);
    }
  }

  const filtered = employees.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await setTrainingEnrollments(trainingId, Array.from(selected));
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`Associar colaboradores — ${trainingName}`} widthClassName="max-w-lg">
      <div className="space-y-3">
        <Input placeholder="Procurar colaborador..." value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-stone-200 p-2 dark:border-stone-800">
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-stone-400 dark:text-stone-500">
              Sem colaboradores correspondentes.
            </p>
          ) : (
            filtered.map((emp) => (
              <label
                key={emp.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                <input
                  type="checkbox"
                  checked={selected.has(emp.id)}
                  onChange={() => toggle(emp.id)}
                  className="rounded border-stone-300 text-violet-600 dark:border-stone-700"
                />
                <span className="text-stone-700 dark:text-stone-300">{emp.name}</span>
              </label>
            ))
          )}
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400">{selected.size} colaborador(es) selecionado(s).</p>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
