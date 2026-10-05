"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "p4p-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Lido só no cliente (localStorage não existe no SSR) — não há como evitar
    // o setState aqui sem arriscar um hydration mismatch.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function respond(value: "accepted" | "rejected") {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // armazenamento indisponível (ex.: modo privado) — a escolha só vale para esta visita
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white/97 px-6 py-5 backdrop-blur sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
          Usamos cookies para melhorar a sua experiência no site e perceber como é utilizado. Pode
          aceitar ou rejeitar os cookies não essenciais a qualquer momento — consulte a nossa{" "}
          <Link href="/privacidade" className="font-medium text-violet-700 underline underline-offset-2">
            Política de Privacidade
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => respond("rejected")}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Rejeitar
          </button>
          <button
            type="button"
            onClick={() => respond("accepted")}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
