import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { ColaboradorTabs } from "../tabs";
import { UploadDocumentForm } from "./upload-document-form";
import { deleteEmployeeDocument } from "./actions";
import { notFound } from "next/navigation";
import { User, FileText, Trash2, Download } from "lucide-react";

export default async function ColaboradorAnexosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const scope = await employeeScopeWhere(user);

  const employee = await prisma.employee.findFirst({ where: { AND: [{ id }, scope] } });
  if (!employee) notFound();

  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId: employee.id },
    orderBy: { uploadedAt: "desc" },
  });

  const canManage = canWrite(user.roles, "recursos") || user.employeeId === employee.id;
  const boundDelete = deleteEmployeeDocument.bind(null, employee.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={User}
        title={`${employee.firstName} ${employee.lastName}`}
        description={employee.jobTitle}
      />

      <ColaboradorTabs employeeId={employee.id} />

      {canManage && (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
            Adicionar anexo
          </h2>
          <UploadDocumentForm employeeId={employee.id} />
        </Card>
      )}

      <Card className="p-0">
        {documents.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={FileText} message="Sem anexos carregados." />
          </div>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/10 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
                    <FileText size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                      {doc.name}
                    </p>
                    <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                      {doc.fileName} · {doc.uploadedAt.toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={doc.fileData}
                    download={doc.fileName}
                    title="Descarregar"
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <Download size={14} />
                  </a>
                  {canManage && (
                    <form action={boundDelete.bind(null, doc.id)}>
                      <button
                        type="submit"
                        title="Eliminar"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 text-rose-600 hover:bg-rose-50 dark:border-stone-700 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 size={14} />
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
  );
}
