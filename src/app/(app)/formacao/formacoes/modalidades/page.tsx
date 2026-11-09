import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accessFor, canWrite } from "@/lib/roles";
import { redirect } from "next/navigation";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { TrainingModalityModal } from "../modality-modal";
import { Settings2, Plus, Pencil } from "lucide-react";

export default async function ModalidadesPage() {
  const user = await requireUser();
  const access = accessFor(user.roles, "formacao");
  if (access === "own") redirect("/formacao");
  if (access !== "rw") redirect("/formacao/formacoes");
  const canEdit = canWrite(user.roles, "formacao");

  const modalities = await prisma.trainingModality.findMany({ orderBy: { code: "asc" } });

  return (
    <div>
      <PageHeader
        icon={Settings2}
        title="Modalidades de Formação"
        description="Configuração das modalidades disponíveis para associar a uma formação."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-0">
          {modalities.length === 0 ? (
            <div className="p-6">
              <EmptyState message="Sem modalidades configuradas." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  <tr>
                    <th className="px-4 py-3">Sigla</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {modalities.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 font-medium">{m.code}</td>
                      <td className="px-4 py-3">{m.description}</td>
                      <td className="px-4 py-3">
                        <Badge color={m.active ? "green" : "slate"}>{m.active ? "Ativa" : "Inativa"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEdit && (
                          <TrainingModalityModal modality={m}>
                            <button
                              type="button"
                              title="Editar"
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-300 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                            >
                              <Pencil size={13} />
                            </button>
                          </TrainingModalityModal>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {canEdit && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Modalidade</h2>
            <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
              Crie uma nova modalidade ou clique no lápis numa linha da tabela para a editar.
            </p>
            <TrainingModalityModal>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                <Plus size={14} /> Nova Modalidade
              </button>
            </TrainingModalityModal>
          </Card>
        )}
      </div>
    </div>
  );
}
