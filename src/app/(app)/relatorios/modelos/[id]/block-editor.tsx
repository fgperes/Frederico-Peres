"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { SaveBanner } from "@/components/save-banner";
import { saveDocumentTemplateBlocks } from "../actions";
import { BLOCK_TYPE_LABELS, defaultBlockForType, type DocumentBlock, type DocumentBlockType } from "@/lib/document-templates";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function BlockEditor({
  templateId,
  initialBlocks,
  reportOptions,
}: {
  templateId: string;
  initialBlocks: DocumentBlock[];
  reportOptions: { key: string; label: string }[];
}) {
  const [blocks, setBlocks] = useState<DocumentBlock[]>(initialBlocks);
  const [newType, setNewType] = useState<DocumentBlockType>("TEXT");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function update(id: string, patch: Partial<DocumentBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as DocumentBlock) : b)));
  }

  function move(index: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function addBlock() {
    setBlocks((prev) => [...prev, { id: uid(), ...defaultBlockForType(newType) } as DocumentBlock]);
  }

  function save() {
    setStatus("idle");
    startTransition(async () => {
      const result = await saveDocumentTemplateBlocks(templateId, blocks);
      if (result.error) {
        setStatus("error");
        setMessage(result.error);
        return;
      }
      setStatus("success");
      setMessage("Modelo guardado com sucesso.");
      router.refresh();
    });
  }

  return (
    <div>
      {status !== "idle" && <SaveBanner status={status} message={message} />}

      {blocks.length === 0 ? (
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">Sem blocos ainda — adicione o primeiro abaixo.</p>
      ) : (
        <ul className="mb-4 space-y-3">
          {blocks.map((block, i) => (
            <li key={block.id} className="rounded-lg border border-stone-200 p-3 dark:border-stone-700">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Badge color="blue">{BLOCK_TYPE_LABELS[block.type]}</Badge>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="rounded p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30 dark:hover:text-stone-200 dark:text-stone-500 dark:text-stone-300"
                    title="Mover para cima"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === blocks.length - 1}
                    className="rounded p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30 dark:hover:text-stone-200 dark:text-stone-500 dark:text-stone-300"
                    title="Mover para baixo"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(block.id)}
                    className="rounded p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 dark:text-stone-500"
                    title="Remover bloco"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <BlockFields block={block} reportOptions={reportOptions} onChange={(patch) => update(block.id, patch)} />
            </li>
          ))}
        </ul>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Novo bloco</label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as DocumentBlockType)}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
          >
            {Object.entries(BLOCK_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="secondary" onClick={addBlock}>
          <Plus size={14} /> Adicionar bloco
        </Button>
      </div>

      <Button type="button" onClick={save} disabled={pending}>
        {pending ? "A guardar..." : "Guardar modelo"}
      </Button>
    </div>
  );
}

function BlockFields({
  block,
  reportOptions,
  onChange,
}: {
  block: DocumentBlock;
  reportOptions: { key: string; label: string }[];
  onChange: (patch: Partial<DocumentBlock>) => void;
}) {
  if (block.type === "HEADER_LOGO") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <TextInput label="Título" value={block.title} onChange={(v) => onChange({ title: v })} />
        <TextInput label="Subtítulo (opcional)" value={block.subtitle} onChange={(v) => onChange({ subtitle: v })} />
        <p className="text-xs text-stone-500 dark:text-stone-400 sm:col-span-2">
          O logótipo da empresa vem de Perfis e Acessos → Documentos.
        </p>
      </div>
    );
  }
  if (block.type === "TEXT") {
    return (
      <textarea
        value={block.text}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={2}
        placeholder="Texto fixo a mostrar no documento..."
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
      />
    );
  }
  if (block.type === "REPORT_TABLE") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Relatório</label>
          <select
            value={block.reportKey}
            onChange={(e) => onChange({ reportKey: e.target.value })}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
          >
            {reportOptions.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <TextInput label="Título (opcional)" value={block.title} onChange={(v) => onChange({ title: v })} />
      </div>
    );
  }
  if (block.type === "SCHEDULE_GRID") {
    return <TextInput label="Título" value={block.title} onChange={(v) => onChange({ title: v })} />;
  }
  if (block.type === "SIGNATURE") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Tipo</label>
          <select
            value={block.mode}
            onChange={(e) => onChange({ mode: e.target.value as "PER_EMPLOYEE" | "SINGLE" })}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
          >
            <option value="PER_EMPLOYEE">Uma linha por colaborador</option>
            <option value="SINGLE">Linha única</option>
          </select>
        </div>
        <TextInput label="Legenda" value={block.label} onChange={(v) => onChange({ label: v })} />
      </div>
    );
  }
  return null;
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
      />
    </div>
  );
}
