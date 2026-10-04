"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";
import { getMonthStart, getMonthDays, isoDate, addMonthsIso } from "@/lib/dates";
import { readFileAsDataUrl } from "@/lib/client-files";
import { requestAbsenceDays, cancelAbsence } from "./actions";

export type AbsenceSummary = {
  id: string;
  absenceTypeId: string;
  typeName: string;
  startDate: string; // AAAA-MM-DD
  endDate: string; // AAAA-MM-DD
  days: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reason: string | null;
  documentName: string | null;
  documentData: string | null;
  decisionNote: string | null;
};

export type AbsenceTypeOption = {
  id: string;
  name: string;
  unitType: string;
  requiresDocument: boolean;
};

const MAX_FILE_BYTES = 2 * 1024 * 1024;

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CANCELLED: "Cancelado",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  CANCELLED: "border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400",
};

function expandRange(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  while (cursor <= end) {
    out.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// Mesmo processo de marcação de Férias (calendário mensal, clicar os dias
// para selecionar, guardar tudo junto), com as diferenças de obrigar à
// escolha do tipo de ausência e permitir anexar um comprovativo real. Se o
// dia clicado já pertencer a um pedido existente, mostra o detalhe desse
// pedido (com opção de cancelar, se ainda estiver pendente) em vez de abrir
// uma seleção nova.
export function AbsenceRequestModal({
  open,
  onClose,
  employeeId,
  employeeName,
  year,
  absences,
  absenceTypes,
  anchorIso,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  year: number;
  absences: AbsenceSummary[];
  absenceTypes: AbsenceTypeOption[];
  anchorIso?: string;
}) {
  const router = useRouter();

  const existingAbsence = anchorIso
    ? absences.find((a) => a.status !== "CANCELLED" && anchorIso >= a.startDate && anchorIso <= a.endDate)
    : undefined;

  const occupiedDays = new Set<string>();
  for (const a of absences) {
    if (a.status === "CANCELLED") continue;
    for (const d of expandRange(a.startDate, a.endDate)) occupiedDays.add(d);
  }

  const todayMonthIso =
    new Date().getFullYear() === year
      ? isoDate(new Date(year, new Date().getMonth(), 1))
      : `${year}-01-01`;
  const defaultMonthIso = anchorIso ? `${anchorIso.slice(0, 7)}-01` : todayMonthIso;
  const defaultTypeId = absenceTypes[0]?.id ?? "";
  const defaultSelected = () => new Set(anchorIso && !existingAbsence && !occupiedDays.has(anchorIso) ? [anchorIso] : []);

  const [monthIso, setMonthIso] = useState(defaultMonthIso);
  const [typeId, setTypeId] = useState(defaultTypeId);
  const [selected, setSelected] = useState<Set<string>>(defaultSelected());
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Remonta o <input type="file"> (limpando a seleção nativa do browser)
  // sempre que a modal ressincroniza para um novo ponto de partida.
  const [fileInputKey, setFileInputKey] = useState(0);

  // A modal não desmonta entre aberturas — ao reabrir com uma âncora
  // diferente, ressincroniza o estado para esse novo ponto de partida.
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevAnchor, setPrevAnchor] = useState(anchorIso);
  if (open !== prevOpen || anchorIso !== prevAnchor) {
    setPrevOpen(open);
    setPrevAnchor(anchorIso);
    if (open) {
      setMonthIso(defaultMonthIso);
      setTypeId(defaultTypeId);
      setSelected(defaultSelected());
      setReason("");
      setFile(null);
      setError(null);
      setFileInputKey((k) => k + 1);
    }
  }

  const selectedType = absenceTypes.find((t) => t.id === typeId);
  const monthStart = getMonthStart(monthIso);
  const days = getMonthDays(monthStart);
  const atFirstMonth = monthStart.getMonth() === 0;
  const atLastMonth = monthStart.getMonth() === 11;

  function toggleDay(iso: string, disabled: boolean) {
    if (disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  function shiftMonth(dir: 1 | -1) {
    const next = addMonthsIso(monthIso, dir);
    if (getMonthStart(next).getFullYear() !== year) return;
    setMonthIso(next);
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleCancelExisting() {
    if (!existingAbsence) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelAbsence(existingAbsence.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  function handleSubmit() {
    if (selected.size === 0) {
      setError("Selecione pelo menos um dia.");
      return;
    }
    if (!typeId) {
      setError("Selecione o tipo de ausência.");
      return;
    }
    if (selectedType?.requiresDocument && !file) {
      setError(`O tipo "${selectedType.name}" exige documento comprovativo.`);
      return;
    }
    if (file && file.size > MAX_FILE_BYTES) {
      setError("Ficheiro demasiado grande (máximo 2MB).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const documentData = file ? await readFileAsDataUrl(file) : undefined;
      const result = await requestAbsenceDays(employeeId, typeId, Array.from(selected), {
        reason: reason || undefined,
        documentName: file?.name,
        documentData,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      setSelected(new Set());
      onClose();
    });
  }

  if (existingAbsence) {
    return (
      <Modal open={open} onClose={handleClose} title="Detalhe do pedido">
        <div className="space-y-3">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Colaborador: <span className="font-medium text-stone-900 dark:text-stone-100">{employeeName}</span>
          </p>
          <div className={`rounded-md border px-3 py-2 text-sm ${STATUS_COLOR[existingAbsence.status]}`}>
            <p className="font-medium">
              {existingAbsence.typeName} — {STATUS_LABEL[existingAbsence.status]}
            </p>
            <p className="mt-0.5 text-xs">
              {new Date(`${existingAbsence.startDate}T00:00:00`).toLocaleDateString("pt-PT")} —{" "}
              {new Date(`${existingAbsence.endDate}T00:00:00`).toLocaleDateString("pt-PT")} · {existingAbsence.days} dia(s)
            </p>
            {existingAbsence.reason && <p className="mt-1 text-xs">Motivo: {existingAbsence.reason}</p>}
            {existingAbsence.documentName && (
              <a
                href={existingAbsence.documentData ?? undefined}
                download={existingAbsence.documentName}
                className="mt-1 inline-block text-xs underline"
              >
                Descarregar comprovativo ({existingAbsence.documentName})
              </a>
            )}
            {existingAbsence.decisionNote && <p className="mt-1 text-xs">Nota: {existingAbsence.decisionNote}</p>}
          </div>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={pending}>
              Fechar
            </Button>
            {existingAbsence.status === "PENDING" && (
              <Button variant="danger" onClick={handleCancelExisting} disabled={pending}>
                {pending ? "A cancelar..." : "Cancelar pedido"}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Pedido de Ausência" widthClassName="max-w-xl">
      <div className="space-y-4">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Colaborador: <span className="font-medium text-stone-900 dark:text-stone-100">{employeeName}</span>
        </p>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
            Tipo de ausência
          </label>
          <select
            value={typeId}
            onChange={(e) => {
              setTypeId(e.target.value);
              setSelected(new Set());
            }}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
          >
            {absenceTypes.length === 0 && <option value="">Sem tipos configurados</option>}
            {absenceTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
              Dias (clique para marcar ou desmarcar)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={atFirstMonth}
                className="rounded-md border border-stone-300 p-1 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="w-32 text-center text-sm font-medium capitalize text-stone-900 dark:text-stone-100">
                {monthStart.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                disabled={atLastMonth}
                className="rounded-md border border-stone-300 p-1 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const iso = isoDate(d);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const blockedByWeekend = isWeekend && selectedType?.unitType !== "CALENDAR_DAYS";
              const isOccupied = occupiedDays.has(iso);
              const disabled = blockedByWeekend || isOccupied;
              const checked = selected.has(iso);

              let chipClass: string;
              if (isOccupied) {
                chipClass =
                  "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-600";
              } else if (blockedByWeekend) {
                chipClass = "cursor-not-allowed border-stone-100 text-stone-300 dark:border-stone-800 dark:text-stone-700";
              } else if (checked) {
                chipClass =
                  "cursor-pointer border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-500 dark:border-violet-500 dark:bg-violet-500/10 dark:text-violet-300";
              } else {
                chipClass =
                  "cursor-pointer border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800";
              }

              return (
                <label
                  key={iso}
                  className={`flex flex-col items-center rounded-md border px-1 py-1.5 text-center text-xs ${chipClass}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleDay(iso, disabled)}
                    className="sr-only"
                  />
                  {d.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", "")}
                  <span className="font-semibold">{d.toLocaleDateString("pt-PT", { day: "2-digit" })}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
            Motivo (opcional)
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
            Documento comprovativo
            {selectedType?.requiresDocument && <span className="ml-1 text-rose-600 dark:text-rose-400">(obrigatório)</span>}
          </label>
          <input
            key={fileInputKey}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5 file:text-sm dark:text-stone-400 dark:file:border-stone-700 dark:file:bg-stone-800 dark:file:text-stone-100"
          />
        </div>

        {error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending || selected.size === 0}>
            {pending ? "A submeter..." : "Submeter pedido"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
