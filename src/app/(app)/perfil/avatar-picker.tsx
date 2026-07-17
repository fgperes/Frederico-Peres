"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { AVATARS, AVATAR_CATEGORY_LABELS, type AvatarCategory } from "@/lib/avatars";
import { updateAvatar } from "./actions";

const CATEGORIES: AvatarCategory[] = ["anime", "cartoon", "cinema"];

export function AvatarPicker({ currentAvatarKey }: { currentAvatarKey: string | null }) {
  const [selected, setSelected] = useState(currentAvatarKey);
  const [pending, startTransition] = useTransition();

  function handlePick(key: string) {
    setSelected(key);
    startTransition(() => {
      updateAvatar(key);
    });
  }

  return (
    <div className="space-y-5">
      {CATEGORIES.map((category) => (
        <div key={category}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            {AVATAR_CATEGORY_LABELS[category]}
          </p>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {AVATARS.filter((a) => a.category === category).map((avatar) => {
              const isSelected = selected === avatar.key;
              return (
                <button
                  key={avatar.key}
                  type="button"
                  disabled={pending}
                  onClick={() => handlePick(avatar.key)}
                  title={avatar.label}
                  className={`group relative aspect-square overflow-hidden rounded-full ring-2 transition disabled:opacity-60 ${
                    isSelected
                      ? "ring-violet-600"
                      : "ring-transparent hover:ring-stone-300"
                  }`}
                >
                  {avatar.render()}
                  {isSelected && (
                    <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white ring-2 ring-white">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
