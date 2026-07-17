// Catálogo de avatares predefinidos para o perfil do utilizador.
// Ilustrações originais (formas geométricas simples), com inspiração livre
// em arquétipos de anime, banda desenhada/cartoon e cinema clássico — sem
// reproduzir personagens ou marcas protegidas.
import type { ReactNode } from "react";

export type AvatarCategory = "anime" | "cartoon" | "cinema";

export type AvatarDef = {
  key: string;
  label: string;
  category: AvatarCategory;
  render: () => ReactNode;
};

export const AVATAR_CATEGORY_LABELS: Record<AvatarCategory, string> = {
  anime: "Anime",
  cartoon: "Cartoon",
  cinema: "Clássicos de cinema",
};

function Face({
  bg,
  skin,
  children,
}: {
  bg: string;
  skin: string;
  children: ReactNode;
}) {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full">
      <circle cx="32" cy="32" r="32" fill={bg} />
      <circle cx="32" cy="34" r="17" fill={skin} />
      {children}
    </svg>
  );
}

export const AVATARS: AvatarDef[] = [
  // --- Anime -------------------------------------------------------------
  {
    key: "anime-shonen",
    label: "Herói Shonen",
    category: "anime",
    render: () => (
      <Face bg="#fee2e2" skin="#ffe4c4">
        <path d="M15 26 Q32 4 49 26 Q40 18 32 20 Q24 18 15 26Z" fill="#1c1917" />
        <path d="M14 22 L20 8 L24 20 Z" fill="#1c1917" />
        <path d="M50 22 L44 8 L40 20 Z" fill="#1c1917" />
        <ellipse cx="25" cy="35" rx="3.4" ry="4.6" fill="#1c1917" />
        <ellipse cx="39" cy="35" rx="3.4" ry="4.6" fill="#1c1917" />
        <circle cx="24" cy="33" r="1" fill="#fff" />
        <circle cx="38" cy="33" r="1" fill="#fff" />
        <path d="M27 45 Q32 49 37 45" stroke="#78350f" strokeWidth="2" fill="none" strokeLinecap="round" />
      </Face>
    ),
  },
  {
    key: "anime-magical-girl",
    label: "Guerreira Lunar",
    category: "anime",
    render: () => (
      <Face bg="#fce7f3" skin="#ffe9d6">
        <path d="M14 30 Q14 6 32 8 Q50 6 50 30 Q41 16 32 18 Q23 16 14 30Z" fill="#a855f7" />
        <circle cx="32" cy="12" r="3.5" fill="#fbbf24" />
        <ellipse cx="25" cy="35" rx="3.6" ry="4.8" fill="#4c1d95" />
        <ellipse cx="39" cy="35" rx="3.6" ry="4.8" fill="#4c1d95" />
        <circle cx="23.8" cy="32.5" r="1.1" fill="#fff" />
        <circle cx="37.8" cy="32.5" r="1.1" fill="#fff" />
        <path d="M28 46 Q32 49 36 46" stroke="#9f1239" strokeWidth="2" fill="none" strokeLinecap="round" />
      </Face>
    ),
  },
  {
    key: "anime-ronin",
    label: "Ronin Errante",
    category: "anime",
    render: () => (
      <Face bg="#e0f2fe" skin="#f3d3ae">
        <path d="M13 27 Q32 10 51 27 L51 20 Q32 6 13 20 Z" fill="#0f172a" />
        <rect x="12" y="22" width="40" height="6" rx="3" fill="#dc2626" />
        <ellipse cx="25" cy="36" rx="3.2" ry="3.6" fill="#0f172a" />
        <ellipse cx="39" cy="36" rx="3.2" ry="3.6" fill="#0f172a" />
        <path d="M20 44 L44 44" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
        <path d="M18 47 L14 55" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      </Face>
    ),
  },
  {
    key: "anime-mecha",
    label: "Piloto Mecha",
    category: "anime",
    render: () => (
      <Face bg="#dbeafe" skin="#ffe4c4">
        <path d="M12 30 Q12 4 32 4 Q52 4 52 30 L46 30 Q46 14 32 14 Q18 14 18 30 Z" fill="#1d4ed8" />
        <rect x="16" y="28" width="32" height="8" rx="4" fill="#93c5fd" opacity="0.7" />
        <ellipse cx="25" cy="36" rx="3" ry="3.6" fill="#1e3a8a" />
        <ellipse cx="39" cy="36" rx="3" ry="3.6" fill="#1e3a8a" />
        <path d="M27 45 L37 45" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
      </Face>
    ),
  },

  // --- Cartoon -------------------------------------------------------------
  {
    key: "cartoon-explorer",
    label: "Explorador Espacial",
    category: "cartoon",
    render: () => (
      <Face bg="#dcfce7" skin="#ffe4c4">
        <path d="M14 24 Q32 30 50 24 L48 12 Q32 6 16 12 Z" fill="#16a34a" />
        <circle cx="32" cy="10" r="4" fill="#eab308" />
        <circle cx="24" cy="36" r="5" fill="#fff" stroke="#0f172a" strokeWidth="1.5" />
        <circle cx="40" cy="36" r="5" fill="#fff" stroke="#0f172a" strokeWidth="1.5" />
        <circle cx="24" cy="36" r="2.2" fill="#0f172a" />
        <circle cx="40" cy="36" r="2.2" fill="#0f172a" />
        <path d="M27 46 Q32 50 37 46" stroke="#7c2d12" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </Face>
    ),
  },
  {
    key: "cartoon-detective",
    label: "Detetive Retro",
    category: "cartoon",
    render: () => (
      <Face bg="#fef3c7" skin="#f3d3ae">
        <path d="M12 24 Q32 4 52 24 L52 18 Q32 -2 12 18 Z" fill="#92400e" />
        <rect x="10" y="22" width="44" height="5" fill="#78350f" />
        <ellipse cx="25" cy="35" rx="3.2" ry="3.2" fill="#1c1917" />
        <ellipse cx="39" cy="35" rx="3.2" ry="3.2" fill="#1c1917" />
        <path d="M18 32 Q25 28 32 32" stroke="#1c1917" strokeWidth="2" fill="none" strokeLinecap="round" />
        <rect x="27" y="42" width="10" height="4" rx="2" fill="#7c2d12" />
      </Face>
    ),
  },
  {
    key: "cartoon-robot",
    label: "Robô Amigável",
    category: "cartoon",
    render: () => (
      <Face bg="#e0e7ff" skin="#cbd5e1">
        <rect x="15" y="17" width="34" height="34" rx="10" fill="#94a3b8" />
        <circle cx="32" cy="10" r="3" fill="#f43f5e" />
        <rect x="30" y="12" width="4" height="6" fill="#64748b" />
        <rect x="22" y="30" width="8" height="8" rx="2" fill="#0ea5e9" />
        <rect x="34" y="30" width="8" height="8" rx="2" fill="#0ea5e9" />
        <rect x="25" y="44" width="14" height="4" rx="2" fill="#334155" />
      </Face>
    ),
  },
  {
    key: "cartoon-superhero",
    label: "Herói de Capa",
    category: "cartoon",
    render: () => (
      <Face bg="#fee2e2" skin="#ffe4c4">
        <path d="M13 30 Q32 6 51 30 L51 24 Q32 2 13 24 Z" fill="#dc2626" />
        <path d="M17 27 Q32 20 47 27 L44 32 Q32 27 20 32 Z" fill="#1c1917" />
        <ellipse cx="25" cy="37" rx="3.2" ry="3.2" fill="#1c1917" />
        <ellipse cx="39" cy="37" rx="3.2" ry="3.2" fill="#1c1917" />
        <path d="M27 46 Q32 49 37 46" stroke="#7c2d12" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </Face>
    ),
  },

  // --- Cinema clássico -----------------------------------------------------
  {
    key: "cinema-noir",
    label: "Detetive Noir",
    category: "cinema",
    render: () => (
      <Face bg="#e7e5e4" skin="#e7d3b9">
        <path d="M12 24 Q32 2 52 24 L52 16 Q32 8 12 16 Z" fill="#1c1917" />
        <ellipse cx="32" cy="21" rx="22" ry="4" fill="#1c1917" />
        <ellipse cx="25" cy="36" rx="3" ry="3" fill="#292524" />
        <ellipse cx="39" cy="36" rx="3" ry="3" fill="#292524" />
        <path d="M25 45 Q32 41 39 45" stroke="#292524" strokeWidth="2" fill="none" strokeLinecap="round" />
        <rect x="24" y="47" width="16" height="4" rx="1" fill="#44403c" />
      </Face>
    ),
  },
  {
    key: "cinema-goldenage",
    label: "Estrela de Hollywood",
    category: "cinema",
    render: () => (
      <Face bg="#fef9c3" skin="#ffe9d6">
        <path d="M15 30 Q13 8 32 8 Q51 8 49 30 Q46 18 32 18 Q18 18 15 30Z" fill="#3f2d1c" />
        <ellipse cx="25" cy="36" rx="3.2" ry="4" fill="#3f2d1c" />
        <ellipse cx="39" cy="36" rx="3.2" ry="4" fill="#3f2d1c" />
        <path d="M28 46 Q32 49 36 46" stroke="#9f1239" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="41" cy="42" r="0.9" fill="#3f2d1c" />
      </Face>
    ),
  },
  {
    key: "cinema-swashbuckler",
    label: "Aventureiro de Chicote",
    category: "cinema",
    render: () => (
      <Face bg="#fed7aa" skin="#e7b98a">
        <path d="M11 26 Q32 2 53 26 Q32 18 11 26Z" fill="#78350f" />
        <path d="M16 22 Q32 10 48 22 L48 27 Q32 17 16 27 Z" fill="#92400e" />
        <ellipse cx="25" cy="36" rx="3" ry="3.4" fill="#1c1917" />
        <ellipse cx="39" cy="36" rx="3" ry="3.4" fill="#1c1917" />
        <path d="M20 44 Q32 40 44 44" stroke="#1c1917" strokeWidth="2" fill="none" strokeLinecap="round" />
      </Face>
    ),
  },
  {
    key: "cinema-western",
    label: "Cowboy do Oeste",
    category: "cinema",
    render: () => (
      <Face bg="#fde68a" skin="#e7b98a">
        <path d="M10 24 Q32 26 54 24 Q48 8 32 8 Q16 8 10 24Z" fill="#92400e" />
        <ellipse cx="32" cy="24" rx="24" ry="4" fill="#78350f" />
        <ellipse cx="25" cy="37" rx="3" ry="3" fill="#1c1917" />
        <ellipse cx="39" cy="37" rx="3" ry="3" fill="#1c1917" />
        <path d="M26 46 L38 46" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 40 Q25 43 20 46" stroke="#78350f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M44 40 Q39 43 44 46" stroke="#78350f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </Face>
    ),
  },
];

export function getAvatar(key: string | null | undefined): AvatarDef | null {
  if (!key) return null;
  return AVATARS.find((a) => a.key === key) ?? null;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Mostra o avatar escolhido, ou as iniciais do nome como alternativa.
export function AvatarImage({
  avatarKey,
  name,
  size = 36,
  className = "",
}: {
  avatarKey?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const avatar = getAvatar(avatarKey);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-xs font-semibold text-violet-700 ${className}`}
      style={{ width: size, height: size }}
    >
      {avatar ? avatar.render() : initials(name)}
    </span>
  );
}
