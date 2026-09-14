"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Wand2, Send, Trash2, AlertTriangle } from "lucide-react";
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

export function GenerateSidebar({
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
  const [collapsed, setCollapsed] = useState(false);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        title="Abrir geração de escalas"
        className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-lg border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        <ChevronRight size={16} />
      </button>
    );
  }

  return (
    <>
      <aside className="w-full shrink-0 rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_3px_rgba(28,25,23,0.06)] sm:w-72 dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Gerar Escalas</h2>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <ChevronLeft size={15} />
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">De</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-xs dark:border-stone-700 dark:bg-stone-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Até</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-xs dark:border-stone-700 dark:bg-stone-800"
            />
          </div>
        </div>
        <p className="mb-3 text-[11px] text-stone-400">Intervalo mínimo: 1 semana.</p>

        <EmployeeTree departments={departments} employees={employees} selected={selected} onChange={setSelected} />

        <div className="mt-4 space-y-2">
          <Button className="w-full justify-center" disabled={disabled} onClick={() => setConfirm("generate")}>
            <Wand2 size={14} /> Gerar
          </Button>
          <Button
            variant="secondary"
            className="w-full justify-center"
            disabled={disabled}
            onClick={() => setConfirm("publish")}
          >
            <Send size={14} /> Publicar
          </Button>
          <Button
            variant="danger"
            className="w-full justify-center"
            disabled={disabled}
            onClick={() => setConfirm("delete")}
          >
            <Trash2 size={14} /> Eliminar
          </Button>
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
      </aside>

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
