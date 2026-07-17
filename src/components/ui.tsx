import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
  icon: Icon,
  avatar,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  avatar?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {avatar ? (
          <span className="mt-0.5 shrink-0">{avatar}</span>
        ) : (
          Icon && (
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/10 text-violet-700">
              <Icon size={20} strokeWidth={2} />
            </span>
          )
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-stone-500">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_1px_3px_rgba(28,25,23,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

const STAT_ACCENTS = {
  violet: "bg-violet-50 text-violet-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  sky: "bg-sky-50 text-sky-700",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "violet",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: keyof typeof STAT_ACCENTS;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-stone-900">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
        </div>
        {Icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${STAT_ACCENTS[accent]}`}
          >
            <Icon size={18} strokeWidth={2} />
          </span>
        )}
      </div>
    </Card>
  );
}

const BADGE_COLORS = {
  slate: "bg-stone-100 text-stone-600 ring-1 ring-inset ring-stone-200",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  red: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
  blue: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20",
} as const;

export function Badge({
  children,
  color = "slate",
}: {
  children: ReactNode;
  color?: keyof typeof BADGE_COLORS;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_COLORS[color]}`}
    >
      {children}
    </span>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-600/20"
      : "border border-stone-300 text-stone-700 hover:bg-stone-50";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${styles}`}
    >
      {children}
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles =
    variant === "primary"
      ? "bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-600/20"
      : variant === "danger"
        ? "bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20"
        : "border border-stone-300 text-stone-700 hover:bg-stone-50";
  return (
    <button
      type={type}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  message,
  icon: Icon,
}: {
  message: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50/50 p-10 text-center">
      {Icon && (
        <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-500">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      )}
      <p className="text-sm text-stone-500">{message}</p>
    </div>
  );
}
