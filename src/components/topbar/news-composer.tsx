"use client";

import { useActionState, useRef, useState } from "react";
import { Megaphone, Bold, Italic, Underline, Smile } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";
import { createNewsAction, type CreateNewsState } from "@/app/(app)/news/actions";

const EMOJIS = ["😀", "😊", "🎉", "👍", "❤️", "📢", "✅", "⚠️", "📅", "🏆", "💡", "🙏"];
const FONT_SIZES = [
  { label: "Normal", value: "3" },
  { label: "Pequeno", value: "2" },
  { label: "Grande", value: "5" },
  { label: "Muito grande", value: "6" },
];

export function NewsComposer({ roles }: { roles: { key: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [targetAll, setTargetAll] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState<CreateNewsState, FormData>(
    async (_prev, formData) => {
      if (editorRef.current && bodyInputRef.current) {
        bodyInputRef.current.value = editorRef.current.innerHTML;
        formData.set("bodyHtml", editorRef.current.innerHTML);
      }
      const result = await createNewsAction(_prev, formData);
      if (result.success) {
        formRef.current?.reset();
        if (editorRef.current) editorRef.current.innerHTML = "";
        setOpen(false);
        setTargetAll(true);
      }
      return result;
    },
    {}
  );

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  function insertEmoji(emoji: string) {
    editorRef.current?.focus();
    document.execCommand("insertText", false, emoji);
    setShowEmoji(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Publicar notícia"
        className="flex h-9 w-9 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        <Megaphone size={18} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova Notícia" widthClassName="max-w-xl">
        <form ref={formRef} action={formAction} className="space-y-4">
          {state.error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
              {state.error}
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Assunto
            </label>
            <input
              name="subject"
              required
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Detalhe
            </label>
            <div className="rounded-md border border-stone-300 dark:border-stone-700">
              <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 p-1.5 dark:border-stone-700">
                <ToolbarButton onClick={() => exec("bold")} icon={Bold} label="Negrito" />
                <ToolbarButton onClick={() => exec("italic")} icon={Italic} label="Itálico" />
                <ToolbarButton onClick={() => exec("underline")} icon={Underline} label="Sublinhado" />
                <select
                  onChange={(e) => exec("fontSize", e.target.value)}
                  defaultValue=""
                  className="rounded border border-stone-300 bg-white px-1.5 py-1 text-xs dark:border-stone-700 dark:bg-stone-800"
                >
                  <option value="" disabled>
                    Tamanho
                  </option>
                  {FONT_SIZES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <ToolbarButton onClick={() => setShowEmoji((v) => !v)} icon={Smile} label="Emoji" />
                  {showEmoji && (
                    <div className="absolute left-0 top-full z-10 mt-1 grid grid-cols-6 gap-1 rounded-md border border-stone-200 bg-white p-2 shadow-lg dark:border-stone-700 dark:bg-stone-800">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => insertEmoji(e)}
                          className="rounded p-1 text-base hover:bg-stone-100 dark:hover:bg-stone-700"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-[120px] px-3 py-2 text-sm focus:outline-none dark:text-stone-100"
              />
            </div>
            <input ref={bodyInputRef} type="hidden" name="bodyHtml" />
          </div>

          <div className="flex items-center gap-2">
            <input id="notifyUsers" type="checkbox" name="notifyUsers" className="h-4 w-4 rounded border-stone-300" />
            <label htmlFor="notifyUsers" className="text-sm text-stone-700 dark:text-stone-300">
              Notificar destinatários (cria tarefa/aviso)
            </label>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-stone-600 dark:text-stone-400">Destinatários</p>
            <div className="rounded-md border border-stone-200 p-2 dark:border-stone-700">
              <label className="flex items-center gap-2 border-b border-stone-100 pb-1.5 text-sm font-medium dark:border-stone-800">
                <input
                  type="checkbox"
                  name="targetAll"
                  checked={targetAll}
                  onChange={(e) => setTargetAll(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300"
                />
                Todos
              </label>
              <div className="mt-1.5 space-y-1 pl-1">
                {roles.map((r) => (
                  <label key={r.key} className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                    <input
                      type="checkbox"
                      name="targetRoles"
                      value={r.key}
                      disabled={targetAll}
                      className="h-4 w-4 rounded border-stone-300 disabled:opacity-40"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "A publicar..." : "Publicar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function ToolbarButton({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: typeof Bold;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
    >
      <Icon size={14} />
    </button>
  );
}
