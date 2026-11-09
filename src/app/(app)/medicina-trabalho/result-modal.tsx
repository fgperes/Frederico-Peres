"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button, Select, Textarea } from "@/components/ui";
import { readFileAsDataUrl } from "@/lib/client-files";
import { closeAppointmentAction } from "./actions";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB

export function ResultModal({
  open,
  onClose,
  appointmentId,
  employeeId,
}: {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  employeeId: string;
}) {
  const [resultStatus, setResultStatus] = useState<"APTO" | "NAO_APTO">("APTO");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (file && file.size > MAX_FILE_BYTES) {
      setError("Ficheiro demasiado grande (máximo 2MB).");
      return;
    }

    startTransition(async () => {
      let documentData: string | undefined;
      if (file) documentData = await readFileAsDataUrl(file);

      const result = await closeAppointmentAction({
        appointmentId,
        employeeId,
        resultStatus,
        resultNotes: notes,
        documentName: file?.name,
        documentType: file?.type,
        documentData,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Registar resultado">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Resultado</label>
          <Select value={resultStatus} onChange={(e) => setResultStatus(e.target.value as "APTO" | "NAO_APTO")}>
            <option value="APTO">Apto</option>
            <option value="NAO_APTO">Não apto</option>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
            Observações (opcional)
          </label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
            Documento (opcional)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-stone-600 file:mr-3 file:rounded-md file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5 file:text-sm dark:text-stone-400 dark:file:border-stone-700 dark:file:bg-stone-800 dark:file:text-stone-100 dark:border-stone-700"
          />
        </div>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            <Paperclip size={14} /> Registar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
