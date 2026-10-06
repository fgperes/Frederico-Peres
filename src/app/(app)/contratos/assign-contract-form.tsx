"use client";

import { useActionState, useState } from "react";
import { assignEmployeeContract, type AssignContractFormState } from "./actions";
import { SaveBanner } from "@/components/save-banner";
import { DateField } from "@/components/date-field";
import { readFileAsDataUrl } from "@/lib/client-files";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB

export function AssignContractForm({
  employeeId,
  profiles,
}: {
  employeeId: string;
  profiles: { id: string; name: string; contractTypeLabel: string; weeklyHours: number }[];
}) {
  const [state, formAction, pending] = useActionState<AssignContractFormState, FormData>(
    assignEmployeeContract,
    {}
  );
  const [documentName, setDocumentName] = useState("");
  const [documentData, setDocumentData] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [readingFile, setReadingFile] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) {
      setDocumentName("");
      setDocumentData("");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("Documento contratual demasiado grande (máximo 2MB).");
      e.target.value = "";
      setDocumentName("");
      setDocumentData("");
      return;
    }
    setReadingFile(true);
    const dataUrl = await readFileAsDataUrl(file);
    setDocumentName(file.name);
    setDocumentData(dataUrl);
    setReadingFile(false);
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <SaveBanner status="error" message={state.error} />}
      {fileError && <SaveBanner status="error" message={fileError} />}
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="documentName" value={documentName} />
      <input type="hidden" name="documentData" value={documentData} />
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Contrato</label>
        <select
          name="contractProfileId"
          required
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.contractTypeLabel} — {p.weeklyHours}h
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Data de início</label>
          <DateField name="startDate" required inputClassName="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Fim período experimental</label>
          <DateField name="trialPeriodEndDate" inputClassName="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Remuneração base (€)</label>
          <input name="baseSalary" type="number" step="0.01" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Documento contratual</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            onChange={handleFileChange}
            className="w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5 file:text-sm"
          />
          <p className="mt-1 text-xs text-stone-400">
            {readingFile ? "A processar ficheiro..." : "PDF, Word ou imagem — máximo 2MB."}
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Notas</label>
        <textarea name="notes" rows={2} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
      </div>

      <button
        type="submit"
        disabled={pending || readingFile}
        className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A atribuir..." : "Atribuir contrato"}
      </button>
    </form>
  );
}
