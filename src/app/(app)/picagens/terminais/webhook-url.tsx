"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function WebhookUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Sem permissão de clipboard (ex.: contexto não seguro) — ignora.
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <code className="max-w-[220px] truncate rounded bg-stone-100 px-1.5 py-0.5 text-[11px] dark:bg-stone-800">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        title="Copiar URL"
        className="text-stone-400 hover:text-violet-600 dark:hover:text-violet-400"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}
