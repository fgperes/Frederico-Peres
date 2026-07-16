"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { changePasswordAction, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      const timeout = setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [state.success, router]);

  if (state.success) {
    return (
      <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        Password alterada com sucesso. A terminar sessão para novo login...
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {forced && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Esta é a sua primeira sessão. Por segurança, tem de definir uma nova
          password antes de continuar.
        </p>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">
          Password atual
        </label>
        <input
          type="password"
          name="currentPassword"
          required
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">
          Nova password (mín. 10 caracteres)
        </label>
        <input
          type="password"
          name="newPassword"
          required
          minLength={10}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">
          Confirmar nova password
        </label>
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={10}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A guardar..." : "Alterar password"}
      </button>
    </form>
  );
}
