import { prisma } from "@/lib/prisma";

// TEMPORÁRIO — diagnóstico do erro 500 no ambiente QA. Nunca mesclar na
// branch partilhada. Grava o erro real (mensagem + stack) num AuditLog
// para podermos ler via SQL, já que os logs de runtime da Vercel não são
// acessíveis por API neste plano.
export async function captureDebug(label: string, err: unknown) {
  try {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const stack = err instanceof Error ? err.stack ?? "" : "";
    await prisma.auditLog.create({
      data: {
        action: "DEBUG_ERROR",
        entity: label,
        details: `${message}\n---STACK---\n${stack}`.slice(0, 4000),
      },
    });
  } catch {
    // se nem isto funcionar, não há nada a fazer — deixa o erro original propagar
  }
}
