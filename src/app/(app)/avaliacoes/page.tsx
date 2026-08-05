import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, EmptyState, LinkButton, Badge } from "@/components/ui";
import { DeleteTemplateButton } from "./delete-template-button";
import { redirect } from "next/navigation";
import { ClipboardCheck, Plus, Pencil } from "lucide-react";
import Link from "next/link";

export default async function AvaliacoesPage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "avaliacoes")) redirect("/dashboard");

  const templates = await prisma.evaluationTemplate.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { questions: true, evaluations: true } },
      assignments: {
        include: {
          team: { select: { name: true } },
          employee: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title="Avaliações de Desempenho"
        description="Modelos de avaliação — perguntas pontuadas, consequências por resultado e a quem ficam atribuídos."
        action={
          <LinkButton href="/avaliacoes/novo">
            <Plus size={15} /> Novo modelo
          </LinkButton>
        }
      />

      {templates.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardCheck} message="Ainda não existem modelos de avaliação." />
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {templates.map((t) => {
              const assignedTo = t.assignments.map((a) =>
                a.team ? `Equipa: ${a.team.name}` : a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : null
              ).filter(Boolean);
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 px-6 py-4">
                  <div className="min-w-0">
                    <Link
                      href={`/avaliacoes/${t.id}`}
                      className="truncate text-sm font-medium text-stone-900 hover:underline dark:text-stone-100"
                    >
                      {t.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                      {t._count.questions} pergunta(s) · {t._count.evaluations} avaliação(ões) criada(s) ·
                      criado por {t.createdBy.name}
                    </p>
                    {assignedTo.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {assignedTo.map((a, i) => (
                          <Badge key={i} color="blue">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/avaliacoes/${t.id}`}
                      title="Editar"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      <Pencil size={14} />
                    </Link>
                    <DeleteTemplateButton templateId={t.id} canDelete={t._count.evaluations === 0} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
