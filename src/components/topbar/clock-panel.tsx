import { ClockWidget } from "@/components/clock-widget";
import type { MealStatus } from "@/lib/meal-rules";
import Link from "next/link";

export function ClockPanel({
  onNavigate,
  status,
}: {
  onNavigate: () => void;
  status: MealStatus;
}) {
  return (
    <div className="p-4">
      <p className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
        Registar Picagem
      </p>
      <ClockWidget compact status={status} />
      <Link
        href="/picagens"
        onClick={onNavigate}
        className="mt-3 block text-center text-xs font-medium text-violet-700 hover:underline dark:text-violet-400"
      >
        Ver histórico de picagens →
      </Link>
    </div>
  );
}
