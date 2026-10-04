"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select, Badge } from "@/components/ui";
import { TimeField } from "@/components/time-field";
import { isoDate } from "@/lib/dates";
import { createShiftAction, updateShiftAction, deleteSingleShiftAction } from "./actions";

export type ShiftTemplateOption = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
};

export type EditingShift = {
  id: string;
  startTime: string;
  endTime: string;
  shiftTemplateId: string | null;
  notes: string | null;
  status: string;
  editedAfterPublish: boolean;
};

export function ShiftModal({
  open,
  onClose,
  employeeId,
  employeeName,
  visibleDays,
  initialDateIso,
  existingShift,
  shiftTemplates,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  visibleDays: Date[];
  initialDateIso?: string;
  existingShift?: EditingShift;
  shiftTemplates: ShiftTemplateOption[];
}) {
  const router = useRouter();
  const isEdit = Boolean(existingShift);

  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    new Set(initialDateIso ? [initialDateIso] : [])
  );
  const [startTime, setStartTime] = useState(existingShift?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(existingShift?.endTime ?? "18:00");
  const [shiftTemplateId, setShiftTemplateId] = useState(existingShift?.shiftTemplateId ?? "");
  const [notes, setNotes] = useState(existingShift?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function applyTemplate(id: string) {
    setShiftTemplateId(id);
    const tpl = shiftTemplates.find((t) => t.id === id);
    if (tpl) {
      setStartTime(tpl.startTime);
      setEndTime(tpl.endTime);
    }
  }

  function toggleDate(iso: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  function handleSaved() {
    router.refresh();
    onClose();
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      if (isEdit) {
        const result = await updateShiftAction(existingShift!.id, {
          startTime,
          endTime,
          shiftTemplateId: shiftTemplateId || null,
          notes,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        handleSaved();
        return;
      }

      const result = await createShiftAction(
        employeeId,
        [...selectedDates],
        startTime,
        endTime,
        shiftTemplateId || null,
        notes
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { created, skippedExisting, skippedDueToRestriction } = result.data;
      if (created === 0) {
        setError(
          skippedExisting > 0
            ? "Já existe turno nesse(s) dia(s) — edite o turno existente em vez de criar outro."
            : skippedDueToRestriction > 0
              ? "Nenhum turno criado — este colaborador não trabalha a fins de semana/feriados (ver perfil de contrato)."
              : "Nenhum turno criado (dia(s) com ausência aprovada)."
        );
        return;
      }
      handleSaved();
    });
  }

  function handleDelete() {
    if (!existingShift) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSingleShiftAction(existingShift.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      handleSaved();
    });
  }

  const canSubmit = isEdit ? true : selectedDates.size > 0;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar turno" : "Criar turno"} widthClassName="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Colaborador: <span className="font-medium text-stone-900 dark:text-stone-100">{employeeName}</span>
        </p>

        {isEdit && existingShift!.status === "PUBLISHED" && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
            Este turno já foi <Badge color="green">publicado</Badge>. Ao guardar, fica marcado como{" "}
            <span className="font-medium">alterado após publicação</span> para que o colaborador perceba que mudou.
          </p>
        )}

        {!isEdit && (
          <div>
            <Field label="Dia(s)" hint="Pode aplicar o mesmo turno a vários dias de uma vez.">
              <div className="grid grid-cols-4 gap-1.5">
                {visibleDays.map((d) => {
                  const iso = isoDate(d);
                  const checked = selectedDates.has(iso);
                  return (
                    <label
                      key={iso}
                      className={`flex cursor-pointer flex-col items-center rounded-md border px-1.5 py-1.5 text-center text-xs ${
                        checked
                          ? "border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-500 dark:bg-violet-500/10 dark:text-violet-300"
                          : "border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleDate(iso)} className="sr-only" />
                      {d.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", "")}
                      <span className="font-semibold">{d.toLocaleDateString("pt-PT", { day: "2-digit" })}</span>
                    </label>
                  );
                })}
              </div>
            </Field>
          </div>
        )}

        {shiftTemplates.length > 0 && (
          <Field label="Modelo de turno" hint="Opcional — preenche as horas automaticamente, pode ajustar depois.">
            <Select value={shiftTemplateId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">Manual (sem modelo)</option>
              {shiftTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.startTime}-{t.endTime})
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Início">
            <TimeField value={startTime} onChange={setStartTime} />
          </Field>
          <Field label="Fim">
            <TimeField value={endTime} onChange={setEndTime} />
          </Field>
        </div>

        <Field label="Notas" hint="Opcional">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: troca com colega" />
        </Field>

        {error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          {isEdit && existingShift!.status === "DRAFT" ? (
            <Button variant="danger" onClick={handleDelete} disabled={pending}>
              <Trash2 size={14} /> Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={pending || !canSubmit}>
              {pending ? "A guardar..." : "Guardar"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
