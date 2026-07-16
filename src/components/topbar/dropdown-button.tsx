"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function DropdownButton({
  icon: Icon,
  label,
  badgeCount,
  isOpen,
  onToggle,
  onClose,
  children,
  panelClassName = "w-80",
}: {
  icon: LucideIcon;
  label: string;
  badgeCount?: number;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        title={label}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
          isOpen ? "bg-violet-50 text-violet-700" : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        }`}
      >
        <Icon size={18} strokeWidth={2} />
        {!!badgeCount && badgeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 z-40 mt-2 origin-top-right rounded-xl border border-stone-200 bg-white shadow-lg ${panelClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
