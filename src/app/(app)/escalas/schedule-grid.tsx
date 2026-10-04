"use client";

import { useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus } from "lucide-react";
import { isoDate } from "@/lib/dates";
import { shiftDurationHours } from "@/lib/schedule";
import { Badge, EmptyState } from "@/components/ui";
import { AvatarImage } from "@/lib/avatars";
import { ShiftModal, type ShiftTemplateOption, type EditingShift } from "./shift-modal";
import { moveShiftAction, copyShiftAction } from "./actions";

export type GridEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string | null;
  weeklyHours: number;
  user?: { avatarKey: string | null; avatarImage: string | null } | null;
};

export type GridShift = {
  id: string;
  employeeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  editedAfterPublish: boolean;
  shiftTemplateId: string | null;
  notes: string | null;
  shiftTemplate?: { name: string; color: string; breakMins: number } | null;
};

export type GridAbsence = {
  employeeId: string;
  date: Date;
  label: string;
  isVacation: boolean;
  isHoliday?: boolean;
};

export type CoverageDay = { dateIso: string; scheduled: number; recommended: number | null };

// Converte a cor hex do modelo de turno (ex.: "#2563eb") num par
// fundo/texto suave para o chip da grelha — não usamos a cor sólida
// diretamente para manter contraste de leitura em ambos os temas.
function chipTint(hex: string | null | undefined, editedAfterPublish: boolean): { bg: string; text: string; border: string } {
  if (editedAfterPublish) {
    // Cor própria e fixa para turnos alterados depois de publicados —
    // sobrepõe-se à cor do modelo para ser inconfundível.
    return { bg: "#ffe4e6", text: "#9f1239", border: "#fda4af" };
  }
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return { bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" }; // violeta por omissão
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.12)`,
    text: hex,
    border: `rgba(${r}, ${g}, ${b}, 0.35)`,
  };
}

// Cor do badge de ausência consoante o tipo — férias ficam sempre a azul
// (módulo dedicado); para as restantes, deriva-se uma cor do nome do tipo
// para distinguir rapidamente baixas/formações de outras ausências, sem
// precisar de um campo novo no schema.
function absenceBadgeColor(label: string, isVacation: boolean, isHoliday?: boolean): "blue" | "red" | "amber" | "slate" {
  if (isVacation) return "blue";
  if (isHoliday) return "amber";
  const l = label.toLowerCase();
  if (l.includes("baixa")) return "red";
  if (l.includes("forma")) return "amber";
  return "slate";
}

function formatPlannedHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type ModalState =
  | { mode: "create"; employeeId: string; employeeName: string; dateIso: string }
  | { mode: "edit"; employeeId: string; employeeName: string; shift: EditingShift }
  | null;

// Tabela partilhada pelas vistas de semana e de mês: colaboradores em
// linha (avatar, nome e total de horas planeadas no período visível,
// fixos à esquerda), datas em coluna. Dias com férias/ausência aprovada
// mostram essa informação; qualquer outro dia sem turno é folga — nunca
// fica em branco. Com permissão de escrita: arrastar um turno move-o,
// Ctrl/Alt copia-o; clicar numa folga cria um turno (vários dias de uma
// vez), clicar num turno existente edita-o (mesmo já publicado).
export function ScheduleGrid({
  employees,
  days,
  shifts,
  absences = [],
  holidayEntries = [],
  holidayDates,
  shiftTemplates = [],
  alertCells = new Set(),
  coverage,
  canEdit = false,
}: {
  employees: GridEmployee[];
  days: Date[];
  shifts: GridShift[];
  absences?: GridAbsence[];
  // Feriados por colaborador (nacionais para todos, regionais consoante o
  // local de trabalho) — mantidos à parte de `absences` para não bloquear
  // o botão de criar turno num feriado (muitos setores trabalham nesse
  // dia); só mudam o rótulo de "Folga" para "Feriado" e o cabeçalho da
  // coluna, nunca impedem marcar um turno.
  holidayEntries?: { employeeId: string; date: Date; label: string }[];
  holidayDates?: Map<string, string>;
  shiftTemplates?: ShiftTemplateOption[];
  alertCells?: Set<string>;
  coverage?: CoverageDay[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);

  const shiftMap = new Map<string, GridShift>();
  for (const s of shifts) shiftMap.set(`${s.employeeId}_${isoDate(s.date)}`, s);

  const absenceMap = new Map<string, GridAbsence>();
  for (const a of absences) absenceMap.set(`${a.employeeId}_${isoDate(a.date)}`, a);

  const holidayCellMap = new Map<string, string>();
  for (const h of holidayEntries) holidayCellMap.set(`${h.employeeId}_${isoDate(h.date)}`, h.label);

  const plannedHoursByEmployee = new Map<string, number>();
  for (const s of shifts) {
    const hours = shiftDurationHours(s.startTime, s.endTime, s.shiftTemplate?.breakMins ?? 0);
    plannedHoursByEmployee.set(s.employeeId, (plannedHoursByEmployee.get(s.employeeId) ?? 0) + hours);
  }

  function handleDrop(e: DragEvent<HTMLTableCellElement>, targetEmployeeId: string, targetDateIso: string) {
    e.preventDefault();
    setDragOverKey(null);
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    let payload: { shiftId: string; employeeId: string; dateIso: string };
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    if (payload.employeeId === targetEmployeeId && payload.dateIso === targetDateIso) return;

    const copy = e.ctrlKey || e.altKey;
    setDropError(null);
    startTransition(async () => {
      const result = copy
        ? await copyShiftAction(payload.shiftId, targetEmployeeId, targetDateIso)
        : await moveShiftAction(payload.shiftId, targetEmployeeId, targetDateIso);
      if (!result.ok) {
        setDropError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <EmptyState message="Sem colaboradores visíveis para os filtros selecionados." />
      </div>
    );
  }

  return (
    <div>
      {dropError && (
        <p className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
          {dropError}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_3px_rgba(28,25,23,0.06)] dark:border-stone-800 dark:bg-stone-900">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 min-w-[240px] border-b border-r border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
                  Colaborador
                </th>
                {days.map((d, i) => {
                  const holidayLabel = holidayDates?.get(isoDate(d));
                  return (
                  <th
                    key={i}
                    title={holidayLabel}
                    className={`min-w-[84px] border-b px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide ${
                      holidayLabel
                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
                        : "border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
                    }`}
                  >
                    {d.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", "")}
                    <div
                      className={`mt-0.5 text-[13px] font-semibold normal-case ${
                        holidayLabel ? "text-amber-800 dark:text-amber-300" : "text-stone-700 dark:text-stone-300"
                      }`}
                    >
                      {d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}
                    </div>
                    {holidayLabel && (
                      <div className="mt-0.5 truncate text-[9px] font-medium normal-case text-amber-700 dark:text-amber-400">
                        {holidayLabel}
                      </div>
                    )}
                  </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {employees.map((e, rowIdx) => {
                const planned = plannedHoursByEmployee.get(e.id) ?? 0;
                const employeeName = `${e.firstName} ${e.lastName}`;
                const rowBg =
                  rowIdx % 2 === 1 ? "bg-stone-50 dark:bg-stone-950" : "bg-white dark:bg-stone-900";
                return (
                  <tr key={e.id} className={rowBg}>
                    <td
                      className={`sticky left-0 z-10 border-b border-r border-stone-200 px-4 py-2.5 dark:border-stone-800 ${rowBg}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <AvatarImage
                          avatarKey={e.user?.avatarKey}
                          avatarImage={e.user?.avatarImage}
                          name={employeeName}
                          size={30}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-stone-900 dark:text-stone-100">{employeeName}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            {formatPlannedHours(planned)} planeado(s)
                            <span className="text-stone-400 dark:text-stone-600"> · {e.weeklyHours}h/sem. contrato</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    {days.map((d, i) => {
                      const dateIso = isoDate(d);
                      const key = `${e.id}_${dateIso}`;
                      const shift = shiftMap.get(key);
                      const absence = absenceMap.get(key);
                      const holidayLabel = holidayCellMap.get(key);
                      const hasAlert = alertCells.has(key);
                      const isDragOver = dragOverKey === key;
                      return (
                        <td
                          key={i}
                          onDragOver={
                            canEdit
                              ? (ev) => {
                                  ev.preventDefault();
                                  setDragOverKey(key);
                                }
                              : undefined
                          }
                          onDragLeave={canEdit ? () => setDragOverKey((k) => (k === key ? null : k)) : undefined}
                          onDrop={canEdit ? (ev) => handleDrop(ev, e.id, dateIso) : undefined}
                          className={`border-b border-stone-100 px-1.5 py-2 text-center align-middle dark:border-stone-800 ${
                            isDragOver ? "bg-violet-50 dark:bg-violet-500/10" : ""
                          }`}
                        >
                          <div className="relative">
                            {hasAlert && (
                              <span
                                className="absolute -top-1 -left-1 z-10 text-amber-500"
                                title="Há um alerta para este dia — ver resumo acima da grelha"
                              >
                                <AlertTriangle size={11} fill="currentColor" className="text-amber-500" />
                              </span>
                            )}
                            {shift ? (
                              <ShiftChip
                                shift={shift}
                                draggable={canEdit}
                                onDragStart={(ev) => {
                                  ev.dataTransfer.setData(
                                    "text/plain",
                                    JSON.stringify({ shiftId: shift.id, employeeId: e.id, dateIso })
                                  );
                                  ev.dataTransfer.effectAllowed = "copyMove";
                                }}
                                onClick={
                                  canEdit
                                    ? () =>
                                        setModalState({
                                          mode: "edit",
                                          employeeId: e.id,
                                          employeeName,
                                          shift: {
                                            id: shift.id,
                                            startTime: shift.startTime,
                                            endTime: shift.endTime,
                                            shiftTemplateId: shift.shiftTemplateId,
                                            notes: shift.notes,
                                            status: shift.status,
                                            editedAfterPublish: shift.editedAfterPublish,
                                          },
                                        })
                                    : undefined
                                }
                              />
                            ) : absence ? (
                              <Badge color={absenceBadgeColor(absence.label, absence.isVacation, absence.isHoliday)}>
                                {absence.label}
                              </Badge>
                            ) : holidayLabel ? (
                              <button
                                type="button"
                                disabled={!canEdit}
                                onClick={
                                  canEdit
                                    ? () => setModalState({ mode: "create", employeeId: e.id, employeeName, dateIso })
                                    : undefined
                                }
                                className={`flex h-7 w-full items-center justify-center rounded-md px-1 text-[10px] font-medium leading-tight text-amber-700 dark:text-amber-400 ${
                                  canEdit
                                    ? "cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10"
                                    : "cursor-default"
                                }`}
                                title={canEdit ? `Feriado — ${holidayLabel} — clique para criar turno` : holidayLabel}
                              >
                                <span className="truncate">{holidayLabel}</span>
                              </button>
                            ) : canEdit ? (
                              <button
                                type="button"
                                onClick={() => setModalState({ mode: "create", employeeId: e.id, employeeName, dateIso })}
                                className="group flex h-7 w-full items-center justify-center rounded-md text-stone-300 hover:bg-violet-50 hover:text-violet-500 dark:text-stone-700 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
                                title="Criar turno"
                              >
                                <Plus size={13} className="opacity-0 transition-opacity group-hover:opacity-100" />
                                <span className="sr-only">Folga — criar turno</span>
                              </button>
                            ) : (
                              <span className="text-xs font-medium italic text-stone-400 dark:text-stone-600">Folga</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            {coverage && coverage.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-stone-200 bg-stone-50/80 dark:border-stone-800 dark:bg-stone-900/80">
                  <td className="sticky left-0 z-10 bg-inherit px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Cobertura prevista
                  </td>
                  {coverage.map((c) => {
                    const short = c.recommended != null && c.scheduled < c.recommended;
                    return (
                      <td key={c.dateIso} className="px-1.5 py-2 text-center text-xs">
                        <span className={short ? "font-semibold text-rose-600 dark:text-rose-400" : "text-stone-600 dark:text-stone-400"}>
                          {c.scheduled}
                        </span>
                        <span className="text-stone-400 dark:text-stone-600">/{c.recommended ?? "—"}</span>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {modalState && (
        <ShiftModal
          open
          onClose={() => setModalState(null)}
          employeeId={modalState.employeeId}
          employeeName={modalState.employeeName}
          visibleDays={days}
          initialDateIso={modalState.mode === "create" ? modalState.dateIso : undefined}
          existingShift={modalState.mode === "edit" ? modalState.shift : undefined}
          shiftTemplates={shiftTemplates}
        />
      )}
    </div>
  );
}

function ShiftChip({
  shift,
  draggable,
  onDragStart,
  onClick,
}: {
  shift: GridShift;
  draggable: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onClick?: () => void;
}) {
  const tint = chipTint(shift.shiftTemplate?.color, shift.editedAfterPublish);
  const published = shift.status === "PUBLISHED";
  const statusLabel = shift.editedAfterPublish
    ? "Publicado — alterado após publicação"
    : published
      ? "Publicado"
      : "Rascunho";
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
      className={`relative mx-auto flex max-w-[110px] flex-col rounded-lg px-2 py-1.5 text-left ${
        onClick ? "cursor-pointer" : ""
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={{ backgroundColor: tint.bg, border: `1px solid ${tint.border}` }}
      title={statusLabel}
    >
      <span
        className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${
          shift.editedAfterPublish ? "bg-rose-500" : published ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      <span className="text-[12px] leading-tight font-semibold" style={{ color: tint.text }}>
        {shift.startTime}-{shift.endTime}
      </span>
      {shift.shiftTemplate?.name && (
        <span className="truncate text-[10px] leading-tight text-stone-500 dark:text-stone-400">
          {shift.shiftTemplate.name}
        </span>
      )}
    </div>
  );
}
