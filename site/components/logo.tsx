import Link from "next/link";

/**
 * Marca "Elo" — dois elos entrelaçados, ligação sem peça central.
 * Espelha o logótipo da aplicação SGRH (src/components/brand/logo.tsx)
 * para o site institucional usar a mesma identidade visual.
 */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect
        x="14" y="38" width="44" height="24" rx="12"
        fill="none" stroke="currentColor" strokeWidth="8"
        transform="rotate(-18 36 50)"
      />
      <rect
        x="42" y="38" width="44" height="24" rx="12"
        fill="none" stroke="currentColor" strokeWidth="8"
        transform="rotate(18 64 50)"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="people4people — início">
      <LogoMark className="h-7 w-7 text-violet-600" />
      <span className="text-[1.05rem] font-bold tracking-tight text-stone-900">
        people<span className="text-violet-600">4</span>people
      </span>
    </Link>
  );
}
