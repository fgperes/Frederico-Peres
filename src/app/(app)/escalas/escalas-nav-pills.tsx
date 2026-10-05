import Link from "next/link";

// Três vistas do módulo Escalas — Semana/Mês (grelha de turnos, dentro de
// /escalas?view=...) e Execução (Previsto vs Real por hora, rota própria
// /escalas/execucao). Partilhado pelas duas páginas para o estado "ativo"
// ficar certo em ambas.
export function EscalasNavPills({
  active,
  filterQuery,
}: {
  active: "week" | "month" | "execucao";
  filterQuery: string;
}) {
  const pill = (href: string, label: string, isActive: boolean) => (
    <Link
      key={href}
      href={href}
      prefetch={false}
      className={`px-4 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-violet-600 text-white"
          : "bg-white text-stone-600 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex overflow-hidden rounded-full border border-stone-300 dark:border-stone-700">
      {pill(`/escalas?view=week&${filterQuery}`, "Semana", active === "week")}
      {pill(`/escalas?view=month&${filterQuery}`, "Mês", active === "month")}
      {pill(`/escalas/execucao?${filterQuery}`, "Execução", active === "execucao")}
    </div>
  );
}
