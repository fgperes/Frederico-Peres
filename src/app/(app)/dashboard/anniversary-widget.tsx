"use client";

import { useState, useTransition } from "react";
import { Check, Send } from "lucide-react";
import { AvatarImage } from "@/lib/avatars";
import { Badge, Button } from "@/components/ui";
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

// Estilo em feed de "publicações" (um cartão por pessoa/ocasião), à
// semelhança do mural de celebrações visto no vídeo de referência — mas as
// mensagens continuam privadas (só o homenageado as vê); não há reações
// nem contagens públicas, porque isso exporia quem comentou.
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
        <div className="space-y-3">
          {entries.map((e) => (
            <AnniversaryCard
              key={`${e.employeeId}-${e.kind}`}
              entry={e}
              isSelf={e.employeeId === currentEmployeeId}
              alreadyCommented={alreadyCommented.has(`${e.employeeId}_${e.kind}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AnniversaryCard({
  entry,
  isSelf,
  alreadyCommented,
}: {
  entry: TodayAnniversaryEntry;
  isSelf: boolean;
  alreadyCommented: boolean;
}) {
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
  const headline = isBirthday
    ? `É o aniversário de ${name}. Felicidades! 🎂`
    : `${name} celebra hoje ${entry.years} ano${entry.years === 1 ? "" : "s"} de casa! 🎉`;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await postAnniversaryComment(entry.employeeId, entry.kind, body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
      setBody("");
    });
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start gap-3">
        <AvatarImage avatarKey={entry.avatarKey} avatarImage={entry.avatarImage} name={name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{headline}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
            <Badge color={isBirthday ? "blue" : "amber"}>{isBirthday ? "Aniversário" : "Aniversário de entrada"}</Badge>
            · Hoje
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
        {isSelf ? (
          <button
            type="button"
            onClick={openMessages}
            className="text-xs font-medium text-violet-700 hover:underline dark:text-violet-400"
          >
            Ver as mensagens que recebeu →
          </button>
        ) : sent ? (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Check size={13} /> Mensagem enviada
          </p>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <input
                value={body}
                onChange={(ev) => setBody(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && !ev.shiftKey && body.trim()) {
                    ev.preventDefault();
                    handleSubmit();
                  }
                }}
                maxLength={500}
                placeholder="Escrever um comentário..."
                className="flex-1 rounded-full border border-stone-300 px-3 py-1.5 text-xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
              <Button
                onClick={handleSubmit}
                disabled={pending || !body.trim()}
                className="flex h-7 w-7 shrink-0 items-center justify-center !rounded-full !p-0"
                title="Enviar"
              >
                <Send size={13} />
              </Button>
            </div>
            {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          </div>
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
    </div>
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
