"use client";

import { useState, useTransition } from "react";
import { MessageSquarePlus, Check } from "lucide-react";
import { AvatarImage } from "@/lib/avatars";
import { Button } from "@/components/ui";
import { AnniversaryMessagesModal } from "./anniversary-messages-modal";
import { postAnniversaryComment, setWorkAnniversaryEnabled, getMyAnniversaryMessages, type AnniversaryMessage } from "./actions";

export type TodayAnniversaryEntry = {
  employeeId: string;
  firstName: string;
  lastName: string;
  avatarKey: string | null;
  avatarImage: string | null;
  kind: "BIRTHDAY" | "WORK_ANNIVERSARY";
  years?: number;
};

export function AnniversaryWidget({
  entries,
  alreadyCommentedKeys,
  currentEmployeeId,
  isSystemAdmin,
  workAnniversaryEnabled,
}: {
  entries: TodayAnniversaryEntry[];
  alreadyCommentedKeys: string[];
  currentEmployeeId: string | null;
  isSystemAdmin: boolean;
  workAnniversaryEnabled: boolean;
}) {
  const alreadyCommented = new Set(alreadyCommentedKeys);

  return (
    <div>
      {isSystemAdmin && <WorkAnniversaryToggle enabled={workAnniversaryEnabled} />}

      {entries.length === 0 ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">Sem aniversários hoje.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <AnniversaryRow
              key={`${e.employeeId}-${e.kind}`}
              entry={e}
              isSelf={e.employeeId === currentEmployeeId}
              alreadyCommented={alreadyCommented.has(`${e.employeeId}_${e.kind}`)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AnniversaryRow({
  entry,
  isSelf,
  alreadyCommented,
}: {
  entry: TodayAnniversaryEntry;
  isSelf: boolean;
  alreadyCommented: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent] = useState(alreadyCommented);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [messagesOpen, setMessagesOpen] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [messages, setMessages] = useState<AnniversaryMessage[]>([]);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [msgPending, startMsgTransition] = useTransition();

  function openMessages() {
    setMessagesOpen(true);
    loadMessages();
  }

  function loadMessages(year?: number) {
    setMsgError(null);
    startMsgTransition(async () => {
      const result = await getMyAnniversaryMessages(entry.employeeId, entry.kind, year);
      if (!result.ok) {
        setMsgError(result.error);
        return;
      }
      setYears(result.data.years);
      setSelectedYear(result.data.selectedYear);
      setMessages(result.data.messages);
    });
  }

  const name = `${entry.firstName} ${entry.lastName}`;
  const isBirthday = entry.kind === "BIRTHDAY";
  const message = isBirthday
    ? isSelf
      ? "🎂 Hoje é o seu aniversário — Feliz Aniversário!"
      : "🎂 Feliz Aniversário!"
    : isSelf
      ? `🎉 Hoje celebra ${entry.years} ano${entry.years === 1 ? "" : "s"} de casa!`
      : `🎉 ${entry.years} ano${entry.years === 1 ? "" : "s"} de casa`;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await postAnniversaryComment(entry.employeeId, entry.kind, body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
      setExpanded(false);
    });
  }

  return (
    <li className="flex items-start gap-3">
      <AvatarImage avatarKey={entry.avatarKey} avatarImage={entry.avatarImage} name={name} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{name}</p>
        <p className="text-xs text-stone-500 dark:text-stone-400">{message}</p>

        {isSelf ? (
          <button
            type="button"
            onClick={openMessages}
            className="mt-1.5 text-xs font-medium text-violet-700 hover:underline dark:text-violet-400"
          >
            Ver as minhas mensagens
          </button>
        ) : sent ? (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <Check size={12} /> Mensagem enviada
          </p>
        ) : expanded ? (
          <div className="mt-1.5 space-y-1.5">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Escreva uma mensagem..."
              className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
            {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            <div className="flex gap-1.5">
              <Button onClick={handleSubmit} disabled={pending || !body.trim()} className="px-2.5 py-1 text-xs">
                {pending ? "A enviar..." : "Enviar"}
              </Button>
              <Button variant="secondary" onClick={() => setExpanded(false)} className="px-2.5 py-1 text-xs">
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline dark:text-violet-400"
          >
            <MessageSquarePlus size={12} /> Deixar mensagem
          </button>
        )}
      </div>

      {isSelf && (
        <AnniversaryMessagesModal
          open={messagesOpen}
          onClose={() => setMessagesOpen(false)}
          title={isBirthday ? "As suas mensagens de aniversário" : "As suas mensagens de aniversário de entrada"}
          years={years}
          selectedYear={selectedYear}
          messages={messages}
          pending={msgPending}
          error={msgError}
          onSelectYear={loadMessages}
        />
      )}
    </li>
  );
}

function WorkAnniversaryToggle({ enabled }: { enabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setWorkAnniversaryEnabled(checked);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-dashed border-stone-300 px-3 py-2 text-xs dark:border-stone-700">
      <div>
        <p className="font-medium text-stone-700 dark:text-stone-300">Aniversários de entrada</p>
        <p className="text-stone-500 dark:text-stone-400">Visível só para Administrador do Sistema.</p>
        {error && <p className="mt-1 text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
      <label className="inline-flex shrink-0 cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(e) => handleToggle(e.currentTarget.checked)}
          className="h-4 w-4 accent-violet-600"
        />
        {enabled ? "Ativo" : "Inativo"}
      </label>
    </div>
  );
}
