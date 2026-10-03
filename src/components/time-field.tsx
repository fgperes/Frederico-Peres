"use client";

import { useState } from "react";

function maskDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  const parts = [digits.slice(0, 2), digits.slice(2, 4)].filter((p) => p.length > 0);
  return parts.join(":");
}

function isValidTime(value: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return false;
  return Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

const BASE_INPUT_CLASS =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100";

// Campo de hora em texto livre, sempre no formato 24h (hh:mm) — substitui o
// <input type="time"> nativo, cujo mostrador (12h AM/PM ou 24h) segue o
// idioma do browser/SO, não o lang="pt" da aplicação, levando a horários
// mal-entendidos (ex.: "11:00 AM" lido como as 11 em vez de 23h).
export function TimeField({
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
  onChange?: (time: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(() => value ?? defaultValue ?? "");

  // Sincroniza com resets vindos de fora, sem interromper a escrita —
  // ajuste durante o render, não num efeito (mesmo padrão do DateField).
  const [prevValue, setPrevValue] = useState(value);
  if (isControlled && value !== prevValue) {
    setPrevValue(value);
    setInternal(value ?? "");
  }

  function handleChange(raw: string) {
    const masked = maskDigits(raw);
    setInternal(masked);
    onChange?.(isValidTime(masked) ? masked : "");
  }

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
        placeholder="hh:mm"
        value={internal}
        onChange={(e) => handleChange(e.target.value)}
        pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
        title="hh:mm (24 horas)"
        required={required}
        disabled={disabled}
        maxLength={5}
        className={inputClassName}
      />
      {name && <input type="hidden" name={name} value={isValidTime(internal) ? internal : ""} />}
    </div>
  );
}
