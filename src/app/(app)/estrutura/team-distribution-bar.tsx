// Barra horizontal de distribuição Full-time / Part-time de uma equipa —
// mesmo padrão visual (barra empilhada com legenda) usado no produto de
// referência para mostrar a composição de uma equipa de forma rápida.
export function TeamDistributionBar({
  fullTime,
  partTime,
}: {
  fullTime: number;
  partTime: number;
}) {
  const total = fullTime + partTime;
  if (total === 0) {
    return <div className="h-1.5 w-full rounded-full bg-stone-100 dark:bg-stone-800" />;
  }
  const fullTimePct = (fullTime / total) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
        <div className="h-full bg-violet-500" style={{ width: `${fullTimePct}%` }} />
        <div className="h-full bg-sky-400" style={{ width: `${100 - fullTimePct}%` }} />
      </div>
      <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">
        {fullTime} full-time · {partTime} part-time
      </span>
    </div>
  );
}
