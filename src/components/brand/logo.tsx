/**
 * Marca "Elo" — dois elos entrelaçados, ligação sem peça central.
 * Usa `currentColor`, controla-se a cor com uma classe de texto
 * (ex.: text-white, text-violet-600) no elemento onde é usada.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect
        x="14"
        y="38"
        width="44"
        height="24"
        rx="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        transform="rotate(-18 36 50)"
      />
      <rect
        x="42"
        y="38"
        width="44"
        height="24"
        rx="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        transform="rotate(18 64 50)"
      />
    </svg>
  );
}

export function PeopleWordmark({
  className,
  fourClassName,
}: {
  className?: string;
  fourClassName?: string;
}) {
  return (
    <span className={`font-brand font-bold ${className ?? ""}`}>
      people
      <span className={fourClassName ?? "text-violet-600 dark:text-violet-400"}>4</span>
      people
    </span>
  );
}
