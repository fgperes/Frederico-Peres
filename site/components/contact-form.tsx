"use client";

import { useActionState, type ReactNode } from "react";
import Link from "next/link";
import { submitDemoForm, type LeadFormState } from "@/app/actions";

const initialState: LeadFormState = {};

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitDemoForm, initialState);

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
      <EmployeeCountField className="sm:col-span-2" />
      <Field label="Email" name="email" type="email" required className="sm:col-span-2" />
      <ConsentCheckbox
        name="dataConsent"
        required
        className="sm:col-span-2"
        label={
          <>
            Autorizo o tratamento dos meus dados pessoais nos termos da{" "}
            <Link href="/privacidade" className="underline hover:text-white">
              Política de Privacidade
            </Link>
            . *
          </>
        }
      />
      <ConsentCheckbox
        name="marketingConsent"
        className="sm:col-span-2"
        label="Autorizo o envio de comunicações comerciais da people4people."
      />
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

export function ConsentCheckbox({
  name,
  label,
  required,
  className = "",
}: {
  name: string;
  label: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex items-start gap-2 text-xs text-violet-100 ${className}`}>
      <input
        type="checkbox"
        name={name}
        required={required}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-0 text-violet-600 focus:ring-2 focus:ring-white"
      />
      <span>{label}</span>
    </label>
  );
}

export function EmployeeCountField({ className = "" }: { className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block font-medium text-violet-100">Número de colaboradores</span>
      <select
        name="employeeCount"
        defaultValue=""
        className="w-full rounded-md border-0 bg-white/95 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-white"
      >
        <option value="">Selecione...</option>
        <option value="1-10">1 a 10</option>
        <option value="11-50">11 a 50</option>
        <option value="51-200">51 a 200</option>
        <option value="201-500">201 a 500</option>
        <option value="500+">Mais de 500</option>
      </select>
    </label>
  );
}
