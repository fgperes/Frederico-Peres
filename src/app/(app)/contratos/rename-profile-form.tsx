"use client";

import { useActionState } from "react";
import { renameContractProfile, type RenameContractProfileState } from "./actions";
import { SaveBanner } from "@/components/save-banner";

export function RenameProfileForm({ profileId, name }: { profileId: string; name: string }) {
  const [state, formAction, pending] = useActionState<RenameContractProfileState, FormData>(
    renameContractProfile.bind(null, profileId),
    {}
  );

  return (
    <div>
      {state.error && <SaveBanner status="error" message={state.error} />}
      <form action={formAction} className="flex items-center gap-2">
        <input
          name="name"
          defaultValue={name}
          required
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "A guardar..." : "Guardar"}
        </button>
      </form>
    </div>
  );
}
