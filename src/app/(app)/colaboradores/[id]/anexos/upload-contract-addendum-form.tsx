"use client";

import { useRef, useState, useTransition } from "react";
import { FileSignature } from "lucide-react";
import { readFileAsDataUrl } from "@/lib/client-files";
import { uploadEmployeeDocument } from "./actions";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB
const LABEL = "Adenda contratual";

// Carregar uma nova versão do contrato de trabalho (ex.: aumento salarial,
// mudança de funções) não substitui o "Contrato de trabalho" original —
// entra em Anexos como uma entrada nova, sempre com esta etiqueta fixa.
export function UploadContractAddendumForm({ employeeId }: { employeeId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
    formData.set("label", LABEL);
    formData.set("fileName", file.name);
    formData.set("fileData", dataUrl);

    startTransition(() => {
      uploadEmployeeDocument(employeeId, formData)
        .then((result) => {
          if (result.error) {
            setError(result.error);
            return;
          }
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Não foi possível carregar a adenda."));
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
          Nova versão do contrato (adenda)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-stone-600 file:mr-3 file:rounded-md file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5 file:text-sm dark:text-stone-400 dark:file:border-stone-700 dark:file:bg-stone-800 dark:file:text-stone-100 dark:border-stone-700"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
      >
        <FileSignature size={14} />
        {pending ? "A carregar..." : `Carregar como "${LABEL}"`}
      </button>
      {error && <p className="w-full text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </form>
  );
}
