"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, X } from "lucide-react";
import { readImageAsResizedDataUrl } from "@/lib/client-files";
import { uploadClientCompanyLogo, removeClientCompanyLogo } from "./actions";

export function ClientLogoPicker({ currentLogo }: { currentLogo: string | null }) {
  const [logo, setLogo] = useState(currentLogo);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha um ficheiro de imagem (JPG, PNG, etc.).");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const dataUrl = await readImageAsResizedDataUrl(file, 400, 0.9);
      setLogo(dataUrl);
      startTransition(() => {
        uploadClientCompanyLogo(dataUrl)
          .then((result) => {
            if (result.error) setError(result.error);
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : "Não foi possível carregar o logótipo.");
          });
      });
    } catch {
      setError("Não foi possível processar esta imagem.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setLogo(null);
    startTransition(() => {
      removeClientCompanyLogo();
    });
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-32 items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 dark:border-stone-700 dark:bg-stone-800">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URI, não é um asset otimizável pelo next/image
            <img src={logo} alt="Logótipo da empresa cliente" className="max-h-14 max-w-[7.5rem] object-contain" />
          ) : (
            <span className="text-[11px] text-stone-400">Sem logótipo</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={uploading || pending}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <Upload size={13} />
              {uploading ? "A processar..." : "Carregar logótipo"}
            </button>
            {logo && (
              <button
                type="button"
                disabled={pending}
                onClick={handleRemove}
                className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <X size={13} />
                Remover
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <p className="text-xs text-stone-500 dark:text-stone-400">
            JPG ou PNG. Fica no canto superior direito dos documentos exportados (ex.: PDF de
            escalas). Fundo transparente fica branco (é convertido para JPEG).
          </p>
          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
