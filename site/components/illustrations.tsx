/**
 * Ilustrações próprias em SVG (nada de fotos de stock) — mantêm a mesma
 * linguagem visual do logótipo "Elo": formas arredondadas entrelaçadas,
 * paleta roxo/stone. Representam pessoas e ligações entre pessoas, sem
 * depender de imagens externas (mais leve, sem licenciamento a gerir).
 */

const PEOPLE = [
  { cx: 120, cy: 90, r: 26, fill: "#7c3aed" },
  { cx: 230, cy: 60, r: 20, fill: "#c4b5fd" },
  { cx: 310, cy: 140, r: 30, fill: "#ede9fe" },
  { cx: 70, cy: 210, r: 22, fill: "#ddd6fe" },
  { cx: 200, cy: 220, r: 34, fill: "#7c3aed" },
  { cx: 330, cy: 260, r: 18, fill: "#c4b5fd" },
];

const LINKS: [number, number][] = [
  [0, 1], [1, 2], [0, 3], [0, 4], [4, 2], [4, 5],
];

export function TeamIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 320" className={className} aria-hidden="true">
      <rect x="0" y="0" width="400" height="320" rx="28" fill="#faf5ff" />
      {LINKS.map(([a, b], i) => (
        <line
          key={i}
          x1={PEOPLE[a].cx} y1={PEOPLE[a].cy}
          x2={PEOPLE[b].cx} y2={PEOPLE[b].cy}
          stroke="#c4b5fd" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round"
        />
      ))}
      {PEOPLE.map((p, i) => (
        <g key={i}>
          <circle cx={p.cx} cy={p.cy} r={p.r} fill={p.fill} opacity={p.fill === "#ede9fe" || p.fill === "#ddd6fe" ? 1 : 0.92} />
          <circle cx={p.cx} cy={p.cy - p.r * 0.18} r={p.r * 0.32} fill="rgba(255,255,255,0.75)" />
          <path
            d={`M ${p.cx - p.r * 0.5} ${p.cy + p.r * 0.55} a ${p.r * 0.5} ${p.r * 0.5} 0 0 1 ${p.r} 0 Z`}
            fill="rgba(255,255,255,0.55)"
          />
        </g>
      ))}
    </svg>
  );
}

export function LinkedRingsIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 240" className={className} aria-hidden="true">
      <rect x="0" y="0" width="400" height="240" rx="28" fill="#faf5ff" />
      {[
        { x: 70, y: 60, rot: -16, c: "#7c3aed" },
        { x: 150, y: 110, rot: 14, c: "#a78bfa" },
        { x: 240, y: 70, rot: -10, c: "#c4b5fd" },
        { x: 310, y: 150, rot: 18, c: "#7c3aed" },
      ].map((r, i) => (
        <rect
          key={i}
          x={r.x} y={r.y} width="96" height="52" rx="26"
          fill="none" stroke={r.c} strokeWidth="9"
          transform={`rotate(${r.rot} ${r.x + 48} ${r.y + 26})`}
        />
      ))}
    </svg>
  );
}
