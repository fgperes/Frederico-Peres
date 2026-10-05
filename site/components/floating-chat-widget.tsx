"use client";

import { useActionState, useState } from "react";
import { MessageCircle, X, ArrowLeft } from "lucide-react";
import { LogoMark } from "./logo";
import { submitInfoForm, submitSupportForm, type LeadFormState } from "@/app/actions";

type View = "question" | "support-form" | "info-form";

const initialState: LeadFormState = {};

export function FloatingChatWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("question");

  function toggleOpen() {
    setOpen((o) => {
      if (!o) setView("question");
      return !o;
    });
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] sm:bottom-6 sm:right-6">
      {open && (
        <div className="mb-3 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-2 bg-violet-600 px-4 py-3.5">
            <div className="flex items-center gap-2 text-white">
              <LogoMark className="h-6 w-6" />
              <span className="text-sm font-semibold">people4people</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="flex h-7 w-7 items-center justify-center rounded-full text-violet-100 hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-5">
            {view === "question" && <QuestionView onPick={setView} />}
            {view === "support-form" && <SupportFormView onBack={() => setView("question")} />}
            {view === "info-form" && <InfoFormView onBack={() => setView("question")} />}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggleOpen}
        aria-label={open ? "Fechar assistente" : "Falar connosco"}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-violet-700"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}

function QuestionView({ onPick }: { onPick: (view: View) => void }) {
  return (
    <div>
      <p className="text-base font-semibold text-stone-900">Já é cliente da people4people?</p>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
        Para o encaminharmos para o sítio certo, diga-nos se já utiliza o SGRH na sua empresa.
      </p>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => onPick("support-form")}
          className="flex-1 rounded-md bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => onPick("info-form")}
          className="flex-1 rounded-md border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Não
        </button>
      </div>
    </div>
  );
}

function SuccessView({ title, message }: { title: string; message: string }) {
  return (
    <div className="py-2 text-center">
      <p className="text-base font-semibold text-stone-900">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{message}</p>
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-900"
    >
      <ArrowLeft size={13} />
      Voltar
    </button>
  );
}

function SupportFormView({ onBack }: { onBack: () => void }) {
  const [state, formAction, pending] = useActionState(submitSupportForm, initialState);

  if (state.success) {
    return (
      <SuccessView
        title="Pedido enviado!"
        message="A nossa equipa de customer service vai entrar em contacto consigo com a maior brevidade possível."
      />
    );
  }

  return (
    <div>
      <BackButton onBack={onBack} />
      <p className="text-base font-semibold text-stone-900">Pedido de suporte</p>
      <p className="mt-1 text-sm leading-relaxed text-stone-600">
        Conte-nos os dados da sua empresa e exponha a situação — a nossa equipa de apoio ao cliente
        trata do resto.
      </p>
      <form action={formAction} className="mt-4 space-y-3 text-left">
        <WidgetField label="Nome da empresa" name="companyName" required />
        <WidgetField label="Nome de contacto" name="contactName" required />
        <WidgetField label="Email" name="email" type="email" required />
        <WidgetField label="Telefone" name="phone" type="tel" />
        <WidgetEmployeeCountField />
        <WidgetTextareaField label="Descreva a situação" name="situation" required />
        {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "A enviar..." : "Enviar pedido"}
        </button>
      </form>
    </div>
  );
}

function InfoFormView({ onBack }: { onBack: () => void }) {
  const [state, formAction, pending] = useActionState(submitInfoForm, initialState);

  if (state.success) {
    return (
      <SuccessView
        title="Pedido enviado!"
        message="Obrigado pelo interesse! A nossa equipa vai entrar em contacto consigo o mais breve possível."
      />
    );
  }

  return (
    <div>
      <BackButton onBack={onBack} />
      <p className="text-base font-semibold text-stone-900">Pedido de informação</p>
      <p className="mt-1 text-sm leading-relaxed text-stone-600">
        Deixe os seus dados e a nossa equipa entra em contacto para lhe apresentar o SGRH.
      </p>
      <form action={formAction} className="mt-4 space-y-3 text-left">
        <WidgetField label="Nome da empresa" name="companyName" required />
        <WidgetField label="Nome de contacto" name="contactName" required />
        <WidgetField label="Função" name="role" />
        <WidgetField label="Telefone" name="phone" type="tel" />
        <WidgetEmployeeCountField />
        <WidgetField label="Email" name="email" type="email" required />
        {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "A enviar..." : "Pedir informação"}
        </button>
      </form>
    </div>
  );
}

function WidgetField({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-stone-700">
        {label}
        {required && " *"}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-md border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      />
    </label>
  );
}

function WidgetTextareaField({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-stone-700">
        {label}
        {required && " *"}
      </span>
      <textarea
        name={name}
        required={required}
        rows={3}
        className="w-full resize-none rounded-md border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      />
    </label>
  );
}

function WidgetEmployeeCountField() {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-stone-700">Número de colaboradores</span>
      <select
        name="employeeCount"
        defaultValue=""
        className="w-full rounded-md border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
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
