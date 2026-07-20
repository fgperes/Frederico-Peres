"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, Users, CalendarClock, Fingerprint } from "lucide-react";
import { TalenzaMark } from "@/components/brand/logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email ou palavra-passe inválidos.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-1">
      {/* Painel de marca */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-700 to-violet-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_70%,white,transparent_35%)]" />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
            <TalenzaMark className="h-5 w-5" />
          </span>
          <span className="font-brand text-lg font-bold">Talenza</span>
        </div>

        <div className="relative">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-violet-200/80">
            Talento, no ritmo certo.
          </p>
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Uma só plataforma para gerir pessoas, horários e assiduidade.
          </h2>
          <p className="mt-4 max-w-sm text-sm text-violet-100">
            Colaboradores, horários, picagens, ausências e contratos —
            centralizados, com controlo de acesso por perfil.
          </p>

          <div className="mt-8 flex flex-col gap-3 text-sm text-violet-100">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
                <Users size={14} />
              </span>
              Gestão de colaboradores e estrutura organizacional
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
                <CalendarClock size={14} />
              </span>
              Horários manuais, cíclicos e preditivos
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
                <Fingerprint size={14} />
              </span>
              Picagens, ausências e contratos num só lugar
            </div>
          </div>
        </div>

        <p className="relative text-xs text-violet-200/70">
          Gestão de Recursos Humanos
        </p>
      </div>

      {/* Painel de login */}
      <div className="flex flex-1 items-center justify-center bg-stone-50 px-6 py-12 dark:bg-stone-950">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                <TalenzaMark className="h-5 w-5" />
              </span>
              <span className="font-brand text-lg font-bold text-stone-900 dark:text-stone-100">
                Talenza
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
              Talento, no ritmo certo.
            </p>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Bem-vindo de volta
          </h1>
          <p className="mt-1.5 mb-8 text-sm text-stone-500 dark:text-stone-400">
            Entre com as suas credenciais para aceder à plataforma.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"
                />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 py-2.5 pl-9 pr-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  placeholder="nome@empresa.pt"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">
                Palavra-passe
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 py-2.5 pl-9 pr-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-600/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm shadow-violet-600/20 transition-colors hover:bg-violet-700 disabled:opacity-60"
            >
              {loading ? "A entrar..." : "Entrar"}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
