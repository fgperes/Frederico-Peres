"use client";

import { useState } from "react";

// "yyyy-mm-dd" (ou prefixo de um ISO completo) -> "dd/mm/aaaa"
function isoToDisplay(iso?: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// "dd/mm/aaaa" completo -> "yyyy-mm-dd"; incompleto -> ""
function displayToIso(display: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function maskDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter((p) => p.length > 0);
  return parts.join("/");
}

const BASE_INPUT_CLASS =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100";

// Campo de data em texto livre, sempre no formato dd/mm/aaaa — substitui o
// <input type="date"> nativo, cujo formato apresentado (dd/mm ou mm/dd)
// segue o idioma do browser/SO, não o lang="pt" da aplicação. Isso levava a
// trocas silenciosas de dia/mês para quem usa o browser noutro idioma (ex.:
// "03/10/1985" interpretado como 10 de março em vez de 3 de outubro).
export function DateField({
  name,
  label,
  defaultValue,
  value,
  onChange,
  required,
  disabled,
  className = "",
  inputClassName = BASE_INPUT_CLASS,
}: {
  name?: string;
  label?: string;
  defaultValue?: string | null;
  value?: string | null;
  onChange?: (iso: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(() => isoToDisplay(value ?? defaultValue));

  // Sincroniza com resets vindos de fora (ex.: o formulário limpa o campo
  // depois de submeter) sem interromper o utilizador a meio da escrita —
  // ajuste durante o render, não num efeito (o valor externo só muda por
  // ação do próprio componente pai, nunca a cada tecla premida aqui).
  const [prevValue, setPrevValue] = useState(value);
  if (isControlled && value !== prevValue) {
    setPrevValue(value);
    setInternal(isoToDisplay(value));
  }

  function handleChange(raw: string) {
    const masked = maskDigits(raw);
    setInternal(masked);
    onChange?.(displayToIso(masked));
  }

  const iso = displayToIso(internal);

  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
          {label}
        </label>
      )}
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        value={internal}
        onChange={(e) => handleChange(e.target.value)}
        pattern="\d{2}/\d{2}/\d{4}"
        title="dd/mm/aaaa"
        required={required}
        disabled={disabled}
        maxLength={10}
        className={inputClassName}
      />
      {name && <input type="hidden" name={name} value={iso} />}
    </div>
  );
}
