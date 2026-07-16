import { ClockWidget } from "@/components/clock-widget";
import Link from "next/link";

export function ClockPanel({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="p-4">
      <p className="mb-3 text-sm font-semibold text-stone-900">
        Registar Picagem
      </p>
      <ClockWidget compact />
      <Link
        href="/picagens"
        onClick={onNavigate}
        className="mt-3 block text-center text-xs font-medium text-violet-700 hover:underline"
      >
        Ver histórico de picagens →
      </Link>
    </div>
  );
}
