"use client";

import { useActionState } from "react";
import { submitContactForm, type ContactFormState } from "@/app/actions";

const initialState: ContactFormState = {};

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);

  if (state.success) {
    return (
      <div className="mt-8 rounded-2xl bg-white/10 px-6 py-8 text-center">
        <p className="text-base font-semibold text-white">Pedido enviado!</p>
        <p className="mt-1 text-sm text-violet-100">A nossa equipa entra em contacto consigo brevemente.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
      <Field label="Nome da empresa" name="companyName" required />
      <Field label="Nome de contacto" name="contactName" required />
      <Field label="Função" name="role" />
      <Field label="Telefone" name="phone" type="tel" />
      <Field label="Email" name="email" type="email" required className="sm:col-span-2" />
      {state.error && (
        <p className="text-sm text-rose-200 sm:col-span-2">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-violet-900 shadow-sm hover:bg-violet-50 disabled:opacity-60 sm:col-span-2"
      >
        {pending ? "A enviar..." : "Pedir demonstração"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block font-medium text-violet-100">
        {label}
        {required && " *"}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-md border-0 bg-white/95 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white"
      />
    </label>
  );
}
