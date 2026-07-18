"use client";

import { useRef, useState, useTransition } from "react";
import { Paperclip } from "lucide-react";
import { readFileAsDataUrl } from "@/lib/client-files";
import { uploadEmployeeDocument } from "./actions";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB

export function UploadDocumentForm({ employeeId }: { employeeId: string }) {
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!label.trim()) {
      setError("Indique uma etiqueta para o anexo.");
      return;
    }
    if (!file) {
      setError("Escolha um ficheiro.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Ficheiro demasiado grande (máximo 2MB).");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const formData = new FormData();
    formData.set("label", label.trim());
    formData.set("fileName", file.name);
    formData.set("fileData", dataUrl);

    startTransition(() => {
      uploadEmployeeDocument(employeeId, formData)
        .then(() => {
          setLabel("");
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Não foi possível carregar o anexo."));
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
          Etiqueta
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex.: Cartão de Cidadão atualizado"
          className="w-64 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
          Ficheiro
        </label>
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-stone-600 file:mr-3 file:rounded-md file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5 file:text-sm dark:text-stone-400 dark:file:border-stone-700 dark:file:bg-stone-800 dark:file:text-stone-100"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        <Paperclip size={14} />
        {pending ? "A carregar..." : "Adicionar anexo"}
      </button>
      {error && <p className="w-full text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </form>
  );
}
