"use client";

import { Modal } from "@/components/modal";
import { formatDateTime } from "@/lib/format";
import type { AnniversaryMessage } from "./actions";

// Componente apresentacional — quem controla o carregamento (e o
// pedido ao servidor) é o chamador (ver anniversary-widget.tsx), disparado
// pelo clique que abre o modal, não por um efeito. Só o próprio
// homenageado chega a abrir isto (o botão só aparece para ele); a action
// volta a validar no servidor.
export function AnniversaryMessagesModal({
  open,
  onClose,
  title,
  years,
  selectedYear,
  messages,
  pending,
  error,
  onSelectYear,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  years: number[];
  selectedYear: number | null;
  messages: AnniversaryMessage[];
  pending: boolean;
  error: string | null;
  onSelectYear: (year: number) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} widthClassName="max-w-md">
      {years.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => onSelectYear(y)}
              disabled={pending}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                y === selectedYear
                  ? "bg-violet-600 text-white"
                  : "border border-stone-300 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </p>
      )}

      {pending ? (
        <p className="py-6 text-center text-sm text-stone-500 dark:text-stone-400">A carregar...</p>
      ) : messages.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-500 dark:text-stone-400">
          {selectedYear ? "Sem mensagens nesse ano." : "Ainda não recebeu mensagens."}
        </p>
      ) : (
        <ul className="max-h-80 space-y-3 overflow-y-auto">
          {messages.map((m) => (
            <li key={m.id} className="rounded-lg border border-stone-200 p-3 dark:border-stone-700">
              <p className="text-sm text-stone-700 dark:text-stone-300">{m.body}</p>
              <p className="mt-1.5 text-[11px] text-stone-400">
                {m.authorName} · {formatDateTime(m.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
