"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleCanPublishNews } from "./actions";
import { useSaveFeedback } from "@/components/save-banner";
import { AlertCircle } from "lucide-react";

export function ToggleNewsButton({
  userId,
  canPublishNews,
}: {
  userId: string;
  canPublishNews: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { status, message, run } = useSaveFeedback();
  const router = useRouter();

  function handleChange() {
    startTransition(() => {
      run(async () => {
        await toggleCanPublishNews(userId, !canPublishNews);
        router.refresh();
      });
    });
  }

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300">
        <input
          type="checkbox"
          checked={canPublishNews}
          disabled={pending}
          onChange={handleChange}
          className="h-4 w-4 rounded border-stone-300 disabled:opacity-60"
        />
        Pode publicar notícias
      </label>
      {status === "error" && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-400">
          <AlertCircle size={11} className="shrink-0" />
          {message}
        </p>
      )}
    </div>
  );
}
