"use client";

import { useState, useTransition } from "react";
import { Check, Send } from "lucide-react";
import { Modal } from "@/components/modal";
import { AvatarImage } from "@/lib/avatars";
import { Button } from "@/components/ui";
import { AnniversaryMessagesModal } from "./anniversary-messages-modal";
import { postAnniversaryComment, getMyAnniversaryMessages, type AnniversaryMessage } from "./actions";

export type MonthlyAnniversaryEntry = {
  employeeId: string;
  firstName: string;
  lastName: string;
  avatarKey: string | null;
  avatarImage: string | null;
  kind: "BIRTHDAY" | "WORK_ANNIVERSARY";
  day: number;
  years?: number;
};

// Lista de aniversários do mês — cada linha só abre uma modal (como nas
// escalas) com a mensagem de parabéns e o campo para deixar uma mensagem;
// deixou de navegar para a ficha do colaborador.
export function MonthlyAnniversariesList({
  entries,
  alreadyCommentedKeys,
  currentEmployeeId,
  monthName,
}: {
  entries: MonthlyAnniversaryEntry[];
  alreadyCommentedKeys: string[];
  currentEmployeeId: string | null;
  monthName: string;
}) {
  const alreadyCommented = new Set(alreadyCommentedKeys);
  const [selected, setSelected] = useState<MonthlyAnniversaryEntry | null>(null);

  return (
    <>
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {entries.map((e) => (
          <li key={`${e.employeeId}-${e.kind}`}>
            <button
              type="button"
              onClick={() => setSelected(e)}
              className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm"
            >
              <span className="font-medium text-violet-700 hover:underline dark:text-violet-400">
                {e.firstName} {e.lastName}
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {e.kind === "BIRTHDAY"
                  ? `🎂 dia ${e.day}`
                  : `🎉 ${e.years} ano${e.years === 1 ? "" : "s"} de casa · dia ${e.day}`}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <MonthlyAnniversaryModal
          entry={selected}
          isSelf={selected.employeeId === currentEmployeeId}
          alreadyCommented={alreadyCommented.has(`${selected.employeeId}_${selected.kind}`)}
          monthName={monthName}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function MonthlyAnniversaryModal({
  entry,
  isSelf,
  alreadyCommented,
  monthName,
  onClose,
}: {
  entry: MonthlyAnniversaryEntry;
  isSelf: boolean;
  alreadyCommented: boolean;
  monthName: string;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(alreadyCommented);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [showMessages, setShowMessages] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [messages, setMessages] = useState<AnniversaryMessage[]>([]);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [msgPending, startMsgTransition] = useTransition();

  function openMessages() {
    setShowMessages(true);
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

  if (showMessages) {
    return (
      <AnniversaryMessagesModal
        open
        onClose={onClose}
        title={isBirthday ? "As suas mensagens de aniversário" : "As suas mensagens de aniversário de entrada"}
        years={years}
        selectedYear={selectedYear}
        messages={messages}
        pending={msgPending}
        error={msgError}
        onSelectYear={loadMessages}
      />
    );
  }

  const headline = isBirthday
    ? `É o aniversário de ${name} a ${entry.day} de ${monthName}. Felicidades! 🎂`
    : `${name} celebra a ${entry.day} de ${monthName} ${entry.years} ano${entry.years === 1 ? "" : "s"} de casa! 🎉`;

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
    <Modal
      open
      onClose={onClose}
      title={isBirthday ? "Aniversário" : "Aniversário de entrada"}
      widthClassName="max-w-md"
    >
      <div className="flex items-start gap-3">
        <AvatarImage avatarKey={entry.avatarKey} avatarImage={entry.avatarImage} name={name} size={40} />
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{headline}</p>
      </div>

      <div className="mt-4 border-t border-stone-100 pt-4 dark:border-stone-800">
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
    </Modal>
  );
}
