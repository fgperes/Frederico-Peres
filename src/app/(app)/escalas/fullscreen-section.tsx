"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize, Minimize } from "lucide-react";

// Envolve a grelha com um botão de ecrã inteiro (Fullscreen API) — útil
// para rever/editar escalas com muitas linhas sem o resto da aplicação à
// volta. Sincroniza o estado também quando se sai com Esc.
export function FullscreenSection({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(document.fullscreenElement === ref.current);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggle() {
    if (!ref.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await ref.current.requestFullscreen();
    }
  }

  return (
    <div ref={ref} className={isFullscreen ? "overflow-y-auto bg-white p-4 dark:bg-stone-950" : ""}>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
          {isFullscreen ? "Sair de ecrã inteiro" : "Ecrã inteiro"}
        </button>
      </div>
      {children}
    </div>
  );
}
