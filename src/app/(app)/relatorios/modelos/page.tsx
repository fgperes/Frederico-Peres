import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRead, canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getDocumentTemplates } from "@/lib/document-templates";
import { PageHeader, Card, Button, EmptyState } from "@/components/ui";
import { createDocumentTemplate } from "./actions";
import { DeleteTemplateButton } from "./delete-template-button";
import { ExportModalButton } from "./export-modal-button";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutTemplate } from "lucide-react";

export default async function DocumentTemplatesPage() {
  const user = await requireUser();
  if (!canRead(user.roles, "relatorios")) redirect("/dashboard");
  const canManage = canWrite(user.roles, "relatorios");

  const scope = await employeeScopeWhere(user);
  const [templates, departments, teams, employees] = await Promise.all([
    getDocumentTemplates(),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { AND: [scope, { status: "ACTIVE" }] },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, departmentId: true, teamId: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        icon={LayoutTemplate}
        title="Modelos de Documentos"
        description="Monte modelos de documentos para exportar (ex.: escala mensal com logótipo e assinatura), a partir dos dados dos relatórios e da escala — sem fórmulas, só dados já existentes."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-x-auto p-0 lg:col-span-2">
          {templates.length === 0 ? (
            <div className="p-6">
              <EmptyState message="Sem modelos criados." />
            </div>
          ) : (
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Blocos</th>
                  <th className="px-4 py-3">Atualizado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/relatorios/modelos/${t.id}`}
                        className="font-medium text-violet-700 hover:underline dark:text-violet-400"
                      >
                        {t.name}
                      </Link>
                      {t.description && <p className="text-xs text-stone-500 dark:text-stone-400">{t.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{t.blocks.length}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400">
                      {t.updatedAt.toLocaleDateString("pt-PT")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <ExportModalButton
                          templateId={t.id}
                          templateName={t.name}
                          departments={departments}
                          teams={teams}
                          employees={employees}
                        />
                        {canManage && <DeleteTemplateButton templateId={t.id} templateName={t.name} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {canManage && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Novo modelo</h2>
            <form action={createDocumentTemplate} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Nome</label>
                <input
                  name="name"
                  required
                  placeholder="ex.: Escala mensal para afixar"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
                  Descrição (opcional)
                </label>
                <input
                  name="description"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
              <Button type="submit" className="w-full justify-center">
                Criar modelo
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
