"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown } from "lucide-react";

export type SearchableOption = { value: string; label: string };

// Combobox simples: um <select> normal obriga a percorrer a lista toda.
// Este componente mostra um campo de texto onde se pode escrever para
// filtrar as opções, mas continua a submeter o valor (id) real no forms.
export function SearchableSelect({
  name,
  options,
  defaultValue = "",
  placeholder = "Selecione...",
  required = false,
  onChange,
}: {
  name: string;
  options: SearchableOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  const initialOption = options.find((o) => o.value === defaultValue) ?? null;
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState(initialOption?.label ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        // se o texto não corresponder a nenhuma opção válida, repõe a última seleção
        const match = options.find((o) => o.label === query);
        if (!match) {
          const current = options.find((o) => o.value === value);
          setQuery(current?.label ?? "");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [query, value, options]);

  function selectOption(option: SearchableOption) {
    setValue(option.value);
    setQuery(option.label);
    setOpen(false);
    onChange?.(option.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = filtered[highlight];
      if (option) selectOption(option);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setValue("");
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-stone-300 px-3 py-2 pr-8 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
        <ChevronsUpDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-stone-200 bg-white py-1 text-sm shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {filtered.map((option, i) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => selectOption(option)}
                onMouseEnter={() => setHighlight(i)}
                className={`block w-full px-3 py-1.5 text-left ${
                  i === highlight
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
                    : "text-stone-700 dark:text-stone-300"
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
