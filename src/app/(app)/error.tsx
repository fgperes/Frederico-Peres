"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button, LinkButton } from "@/components/ui";

// Boundary de erro para todo o espaço autenticado da aplicação — substitui
// o ecrã técnico em inglês que a Next.js mostra por omissão em produção
// ("An error occurred in the Server Components render...") por uma
// mensagem em português, com o mesmo estilo do resto da app. A razão
// específica do erro continua escondida pela própria Next.js em produção
// (só chega aqui um "digest"); ações que devolvem o motivo real do erro
// (ex.: Férias) mostram-no num aviso na própria página, sem chegar a este
// ecrã.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
        <AlertTriangle size={26} strokeWidth={1.75} />
      </span>
      <div>
        <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Ocorreu um erro</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-stone-500 dark:text-stone-400">
          Não foi possível concluir esta ação. Pode ter sido algo temporário — tente novamente; se o
          problema persistir, contacte o Administrador do Sistema.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-stone-400 dark:text-stone-600">Referência: {error.digest}</p>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Button onClick={reset}>
          <RotateCcw size={14} />
          Tentar novamente
        </Button>
        <LinkButton href="/dashboard" variant="secondary">
          Voltar ao Dashboard
        </LinkButton>
      </div>
    </div>
  );
}
