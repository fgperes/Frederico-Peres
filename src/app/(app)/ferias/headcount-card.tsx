import { Card } from "@/components/ui";
import type { VacationHeadcount } from "@/lib/vacation";

export function VacationHeadcountCard({
  title,
  headcount,
}: {
  title?: string;
  headcount: VacationHeadcount;
}) {
  return (
    <Card>
      {title && (
        <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Dias de férias do ano" value={headcount.entitled} />
        <Stat
          label="Total (com ano anterior)"
          value={headcount.total}
          sub={headcount.carryOver > 0 ? `${headcount.entitled} + ${headcount.carryOver} transitados` : undefined}
        />
        <Stat label="Marcados (aprovados)" value={`${headcount.marked} (${headcount.approved})`} />
        <Stat
          label="Saldo"
          value={headcount.saldo}
          highlight={headcount.saldo < 0}
        />
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number | string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          highlight ? "text-rose-600 dark:text-rose-400" : "text-stone-900 dark:text-stone-100"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-stone-400 dark:text-stone-600">{sub}</p>}
    </div>
  );
}
