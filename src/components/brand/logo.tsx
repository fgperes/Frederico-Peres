/**
 * Marca "Em Foco" — dois cantos de enquadramento com um ponto central,
 * a ficha do colaborador em destaque. Usa `currentColor`, controla-se a
 * cor com uma classe de texto (ex.: text-white, text-violet-600) no elemento
 * onde é usada.
 */
export function TalenzaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d="M22,46 L22,22 L46,22"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M78,54 L78,78 L54,78"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="50" r="13" fill="currentColor" />
    </svg>
  );
}

export function TalenzaWordmark({ className }: { className?: string }) {
  return <span className={`font-brand font-bold ${className ?? ""}`}>Talenza</span>;
}
