import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRead, canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getDocumentTemplate } from "@/lib/document-templates";
import { REPORT_DEFINITIONS } from "@/lib/reports";
import { PageHeader, Card, Button } from "@/components/ui";
import { updateDocumentTemplateMeta } from "../actions";
import { BlockEditor } from "./block-editor";
import { ExportPanel } from "./export-panel";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutTemplate } from "lucide-react";

export default async function DocumentTemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!canRead(user.roles, "relatorios")) redirect("/dashboard");
  const canManage = canWrite(user.roles, "relatorios");

  const template = await getDocumentTemplate(id);
  if (!template) notFound();

  const scope = await employeeScopeWhere(user);
  const [departments, teams, employees] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { AND: [scope, { status: "ACTIVE" }] },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, departmentId: true, teamId: true },
    }),
  ]);

  const updateMeta = updateDocumentTemplateMeta.bind(null, template.id);

  return (
    <div>
      <Link
        href="/relatorios/modelos"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
      >
        <ArrowLeft size={13} /> Modelos de Documentos
      </Link>
      <PageHeader icon={LayoutTemplate} title={template.name} description={template.description ?? undefined} />

      {canManage && (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Dados do modelo</h2>
          <form action={updateMeta} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Nome</label>
              <input
                name="name"
                required
                defaultValue={template.name}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
            <div className="flex-[2] min-w-[220px]">
              <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Descrição</label>
              <input
                name="description"
                defaultValue={template.description ?? ""}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
            <Button type="submit" variant="secondary">
              Guardar
            </Button>
          </form>
        </Card>
      )}

      {canManage && (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Blocos do modelo</h2>
          <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
            Cada bloco mostra só dados já existentes (relatórios, escala, logótipo da empresa) — não há fórmulas
            nem campos calculados dentro do modelo.
          </p>
          <BlockEditor
            templateId={template.id}
            initialBlocks={template.blocks}
            reportOptions={REPORT_DEFINITIONS.map((r) => ({ key: r.key, label: r.label }))}
          />
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Gerar documento</h2>
        <ExportPanel
          templateId={template.id}
          departments={departments}
          teams={teams}
          employees={employees}
        />
      </Card>
    </div>
  );
}
