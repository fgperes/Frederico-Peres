"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Send, Trash2, AlertTriangle, ChevronDown, Users } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { Modal } from "@/components/modal";
import { EmployeeTree, type TreeDepartment, type TreeEmployee } from "./employee-tree";
import {
  generateSchedulesAction,
  publishSchedulesAction,
  deleteSchedulesAction,
  type GenerateSchedulesResult,
} from "./actions";

type ConfirmKind = "generate" | "publish" | "delete" | null;

export function GenerateToolbar({
  departments,
  employees,
  defaultFrom,
  defaultTo,
}: {
  departments: TreeDepartment[];
  employees: TreeEmployee[];
  defaultFrom: string;
  defaultTo: string;
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [genResult, setGenResult] = useState<GenerateSchedulesResult | null>(null);
  const [publishResult, setPublishResult] = useState<{ published: number } | null>(null);
  const [deleteResult, setDeleteResult] = useState<{ deleted: number; blockedPublished: number } | null>(null);
  const router = useRouter();

  const employeeIds = [...selected];
  const disabled = employeeIds.length === 0 || pending;

  function runGenerate() {
    setConfirm(null);
    setError(null);
    setGenResult(null);
    startTransition(async () => {
      const result = await generateSchedulesAction(from, to, employeeIds);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGenResult(result.data);
      router.refresh();
    });
  }

  function runPublish() {
    setConfirm(null);
    setError(null);
    setPublishResult(null);
    startTransition(async () => {
      const result = await publishSchedulesAction(from, to, employeeIds);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPublishResult(result.data);
      router.refresh();
    });
  }

  function runDelete() {
    setConfirm(null);
    setError(null);
    setDeleteResult(null);
    startTransition(async () => {
      const result = await deleteSchedulesAction(from, to, employeeIds);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDeleteResult(result.data);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_3px_rgba(28,25,23,0.06)] dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-wrap items-end gap-3">
          <span className="mb-1.5 flex items-center gap-1.5 self-end text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            <Wand2 size={13} /> Gerar Escalas
          </span>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">De</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Até</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
            />
          </div>

          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Colaboradores</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <Users size={14} className="text-stone-400" />
                {selected.size > 0 ? `${selected.size} selecionado(s)` : "Selecionar"}
                <ChevronDown size={13} className="text-stone-400" />
              </button>
              {employees.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelected(new Set(employees.map((e) => e.id)))}
                  title="Seleciona todos os colaboradores que correspondem aos filtros acima (Departamento/Equipa/Colaborador)"
                  className="whitespace-nowrap text-xs text-violet-700 hover:underline dark:text-violet-400"
                >
                  Selecionar {employees.length} filtrado(s)
                </button>
              )}
            </div>

            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setPickerOpen(false)} />
                <div className="absolute left-0 top-full z-30 mt-1 w-80 rounded-lg border border-stone-200 bg-white p-2 shadow-xl dark:border-stone-700 dark:bg-stone-900">
                  <EmployeeTree departments={departments} employees={employees} selected={selected} onChange={setSelected} />
                </div>
              </>
            )}
          </div>

          <p className="mb-1.5 self-end text-[11px] text-stone-400">Intervalo mínimo: 1 semana.</p>

          <div className="ml-auto flex flex-wrap gap-2">
            <Button disabled={disabled} onClick={() => setConfirm("generate")}>
              <Wand2 size={14} /> Gerar
            </Button>
            <Button variant="secondary" disabled={disabled} onClick={() => setConfirm("publish")}>
              <Send size={14} /> Publicar
            </Button>
            <Button variant="danger" disabled={disabled} onClick={() => setConfirm("delete")}>
              <Trash2 size={14} /> Eliminar
            </Button>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </p>
        )}

        {genResult && (
          <div className="mt-3 space-y-2 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
            <p>
              {genResult.created} turno(s) criado(s)
              {genResult.skippedDueToAbsence > 0 && `, ${genResult.skippedDueToAbsence} ignorado(s) por ausência`}.
            </p>
            {genResult.issues.length > 0 && (
              <div className="rounded-md bg-amber-50 p-2 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
                <p className="mb-1 flex items-center gap-1 font-medium">
                  <AlertTriangle size={12} /> {genResult.issues.length} colaborador(es) sem horário gerado:
                </p>
                <ul className="list-disc space-y-0.5 pl-4">
                  {genResult.issues.map((issue, i) => (
                    <li key={i}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {publishResult && (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
            {publishResult.published} turno(s) publicado(s) e colaboradores notificados.
          </p>
        )}

        {deleteResult && (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
            {deleteResult.deleted} rascunho(s) eliminado(s).
            {deleteResult.blockedPublished > 0 &&
              ` ${deleteResult.blockedPublished} turno(s) publicado(s) mantido(s) (imutáveis).`}
          </p>
        )}
      </div>

      <Modal open={confirm === "generate"} onClose={() => setConfirm(null)} title="Gerar escalas">
        <p className="mb-4 text-sm text-stone-700 dark:text-stone-300">
          Vai gerar horários para <strong>{employeeIds.length}</strong> colaborador(es), entre{" "}
          <strong>{from}</strong> e <strong>{to}</strong>. Dias já com turno atribuído não são alterados, e dias
          com ausência aprovada são automaticamente ignorados. Confirma?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancelar
          </Button>
          <Button onClick={runGenerate} disabled={pending}>
            {pending ? "A gerar..." : "Confirmar"}
          </Button>
        </div>
      </Modal>

      <Modal open={confirm === "publish"} onClose={() => setConfirm(null)} title="Publicar escalas">
        <p className="mb-4 text-sm text-stone-700 dark:text-stone-300">
          Vai publicar os turnos em rascunho de <strong>{employeeIds.length}</strong> colaborador(es), entre{" "}
          <strong>{from}</strong> e <strong>{to}</strong>. <strong>Turnos publicados ficam imutáveis</strong> — para
          os alterar, terá de os eliminar e gerar novamente antes de os publicar de novo. Os colaboradores com
          conta são notificados. Confirma?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancelar
          </Button>
          <Button onClick={runPublish} disabled={pending}>
            {pending ? "A publicar..." : "Confirmar"}
          </Button>
        </div>
      </Modal>

      <Modal open={confirm === "delete"} onClose={() => setConfirm(null)} title="Eliminar escalas">
        <p className="mb-4 text-sm text-stone-700 dark:text-stone-300">
          Vai eliminar os turnos <Badge color="amber">em rascunho</Badge> de <strong>{employeeIds.length}</strong>{" "}
          colaborador(es), entre <strong>{from}</strong> e <strong>{to}</strong>. Turnos já{" "}
          <Badge color="green">publicados</Badge> são imutáveis e não serão afetados. Confirma?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={runDelete} disabled={pending}>
            {pending ? "A eliminar..." : "Confirmar"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
