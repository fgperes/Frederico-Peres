"use client";

import { useState, useTransition } from "react";
import { updateClientCompanyFiscalInfo } from "./actions";
import { Button } from "@/components/ui";
import { Check } from "lucide-react";

export function ClientFiscalInfoForm({
  currentNif,
  currentAddress,
  currentSocialSecurityNo,
}: {
  currentNif: string | null;
  currentAddress: string | null;
  currentSocialSecurityNo: string | null;
}) {
  const [nif, setNif] = useState(currentNif ?? "");
  const [address, setAddress] = useState(currentAddress ?? "");
  const [socialSecurityNo, setSocialSecurityNo] = useState(currentSocialSecurityNo ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateClientCompanyFiscalInfo({ nif, address, socialSecurityNo });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
            Nº de contribuinte (NIF)
          </label>
          <input
            value={nif}
            onChange={(e) => setNif(e.target.value)}
            placeholder="Ex.: 500224366"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
            Nº de identificação da Segurança Social
          </label>
          <input
            value={socialSecurityNo}
            onChange={(e) => setSocialSecurityNo(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
          Morada da sede
        </label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          placeholder={"Ex.: Avenida da República, nº 26\n1069-228 Lisboa"}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
        />
      </div>
      <Button onClick={handleSave} disabled={pending} variant="secondary">
        {pending ? "A guardar..." : saved ? <Check size={14} /> : "Guardar dados fiscais"}
      </Button>
    </div>
  );
}
