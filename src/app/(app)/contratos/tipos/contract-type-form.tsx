"use client";

import { useActionState } from "react";
import { createContractType, type ContractTypeFormState } from "../actions";
import { SaveBanner } from "@/components/save-banner";

export function ContractTypeForm() {
  const [state, formAction, pending] = useActionState<ContractTypeFormState, FormData>(
    createContractType,
    {}
  );

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <SaveBanner status="error" message={state.error} />}
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Nome</label>
        <input name="label" required placeholder="ex.: Estágio Profissional" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {pending ? "A criar..." : "Criar tipo"}
      </button>
    </form>
  );
}
