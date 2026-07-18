"use client";

import { useActionState, useState, useTransition } from "react";
import { MessageCircle, Send } from "lucide-react";
import { sendMessageAction, markMessageRead, type SendMessageState } from "./actions";
import type { Recipient } from "@/lib/messaging";

type InboxMessage = {
  id: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  sender: { name: string };
};

const initialState: SendMessageState = {};

export function MessagesPanel({
  recipients,
  messages,
}: {
  recipients: Recipient[];
  messages: InboxMessage[];
}) {
  const [state, formAction, pending] = useActionState(sendMessageAction, initialState);
  const [tab, setTab] = useState<"inbox" | "compose">(
    messages.some((m) => !m.readAt) ? "inbox" : recipients.length > 0 ? "compose" : "inbox"
  );
  const [, startTransition] = useTransition();

  return (
    <div>
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-700">
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Mensagens Rápidas</p>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("inbox")}
            className={`rounded-md px-2 py-1 font-medium ${tab === "inbox" ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400" : "text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"}`}
          >
            Recebidas
          </button>
          <button
            type="button"
            onClick={() => setTab("compose")}
            className={`rounded-md px-2 py-1 font-medium ${tab === "compose" ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400" : "text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"}`}
          >
            Nova
          </button>
        </div>
      </div>

      {tab === "inbox" && (
        <div className="max-h-80 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <MessageCircle size={20} className="text-stone-400" />
              <p className="text-xs text-stone-500 dark:text-stone-400">Sem mensagens recebidas.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {messages.map((m) => (
                <li
                  key={m.id}
                  onClick={() => {
                    if (!m.readAt) startTransition(() => markMessageRead(m.id));
                  }}
                  className={`cursor-pointer px-4 py-3 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 ${!m.readAt ? "bg-violet-50/40 dark:bg-violet-500/5" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-800 dark:text-stone-200">{m.sender.name}</span>
                    {!m.readAt && <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-stone-600 dark:text-stone-400">{m.body}</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {new Date(m.createdAt).toLocaleString("pt-PT")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "compose" && (
        <form action={formAction} className="space-y-2.5 p-4">
          {recipients.length === 0 ? (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Não há destinatários disponíveis para o seu perfil.
            </p>
          ) : (
            <>
              <select
                name="recipientId"
                required
                className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="">Destinatário...</option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <textarea
                name="body"
                required
                rows={3}
                maxLength={1000}
                placeholder="Escreva a sua mensagem..."
                className="w-full resize-none rounded-lg border border-stone-300 px-2.5 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
              {state.error && (
                <p className="rounded-md bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">{state.error}</p>
              )}
              {state.success && (
                <p className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
                  Mensagem enviada.
                </p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              >
                <Send size={14} />
                {pending ? "A enviar..." : "Enviar"}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
