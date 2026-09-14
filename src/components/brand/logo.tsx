/**
 * Marca "Duas Pessoas" — par de silhuetas simplificadas, o ícone clássico
 * de equipa/RH. Usa `currentColor`, controla-se a cor com uma classe de
 * texto (ex.: text-white, text-violet-600) no elemento onde é usada.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
      <circle cx="32" cy="28" r="14" />
      <path d="M8 78 C 8 56 18 46 32 46 C 46 46 56 56 56 78 Z" />
      <circle cx="66" cy="24" r="11" opacity="0.75" />
      <path d="M46 78 C 46 60 54 50 66 50 C 78 50 86 60 86 78 Z" opacity="0.75" />
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
