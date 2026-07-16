import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { ImportForm } from "./import-form";
import { revertEmployeeImport } from "../actions";
import { redirect } from "next/navigation";
import { Upload } from "lucide-react";

export default async function ImportarColaboradoresPage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "recursos")) redirect("/colaboradores");

  const imports = await prisma.importLog.findMany({
    where: { type: "EMPLOYEES" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: true },
  });

  return (
    <div>
      <PageHeader
        icon={Upload}
        title="Importar Colaboradores"
        description="Importação em massa via ficheiro Excel (GR-04)."
        action={
          <a
            href="/api/templates/colaboradores"
            className="rounded-md border border-stone-300 px-3 py-2 text-sm hover:bg-white"
          >
            Descarregar template
          </a>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-900">
            Novo Ficheiro
          </h2>
          <ImportForm />
        </Card>

        <Card className="p-0">
          <div className="border-b border-stone-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-stone-900">
              Histórico de Importações
            </h2>
          </div>
          {imports.length === 0 ? (
            <div className="p-6">
              <EmptyState message="Sem importações registadas." />
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {imports.map((log) => (
                <li key={log.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <div className="font-medium text-stone-800">{log.fileName}</div>
                    <div className="text-xs text-stone-400">
                      {log.totalRows} linhas · {log.errorRows} erros ·{" "}
                      {log.user?.name} · {log.createdAt.toLocaleString("pt-PT")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      color={
                        log.status === "SUCCESS"
                          ? "green"
                          : log.status === "ERROR"
                            ? "red"
                            : log.status === "REVERTED"
                              ? "slate"
                              : "amber"
                      }
                    >
                      {log.status}
                    </Badge>
                    {log.status !== "REVERTED" && (
                      <form action={revertEmployeeImport.bind(null, log.id)}>
                        <button type="submit" className="text-xs text-rose-600 hover:underline">
                          reverter
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
