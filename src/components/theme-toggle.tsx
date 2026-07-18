"use client";

import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "sgrh-theme";

// Sem estado em React: os dois ícones são sempre renderizados e o CSS
// (variante dark:) escolhe qual mostrar, evitando qualquer mismatch entre
// a renderização no servidor e a hidratação no cliente.
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
    >
      <Moon size={18} strokeWidth={2} className="dark:hidden" />
      <Sun size={18} strokeWidth={2} className="hidden dark:block" />
    </button>
  );
}
