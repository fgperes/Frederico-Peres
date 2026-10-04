import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { LoadCommonTypesButton } from "./load-common-types-button";
import { SsCodeCell } from "./ss-code-cell";
import { AbsenceTypeModal } from "./absence-type-modal";
import { redirect } from "next/navigation";
import { Settings2, Plus, Pencil } from "lucide-react";

export default async function TiposAusenciaPage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "ausencias")) redirect("/ausencias");

  const types = await prisma.absenceType.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader
        icon={Settings2}
        title="Tipos de Ausência"
        description="Configuração de tipos de ausência e respetivas regras (AU-01)."
        action={<LoadCommonTypesButton />}
      />

      <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
        Os tipos comuns carregam com dias/limites e impacto salarial de referência (Código do
        Trabalho), mas <strong>sem código de Segurança Social</strong> — esse depende da vossa
        entidade e de eventuais convenções coletivas aplicáveis. Preencha-o (coluna &quot;Código
        SS&quot;) e reveja os limites de dias com o vosso contabilista antes de reportar à
        Segurança Social.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-0">
          {types.length === 0 ? (
            <div className="p-6"><EmptyState message="Sem tipos configurados." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Código SS</th>
                    <th className="px-4 py-3">Impacto salarial</th>
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3">Unidade</th>
                    <th className="px-4 py-3">Limite anual</th>
                    <th className="px-4 py-3">Bolsa de horas</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {types.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 font-medium">{t.name}</td>
                      <td className="px-4 py-3">
                        <SsCodeCell absenceTypeId={t.id} code={t.socialSecurityCode} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          color={
                            t.salaryImpactPercent === 100
                              ? "green"
                              : t.salaryImpactPercent === 0
                                ? "slate"
                                : "amber"
                          }
                        >
                          {t.salaryImpactPercent}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={t.requiresDocument ? "amber" : "slate"}>
                          {t.requiresDocument ? "Obrigatório" : "Não exige"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {t.unitType === "WORKING_DAYS" ? "Dias úteis" : "Dias corridos"}
                      </td>
                      <td className="px-4 py-3">{t.annualLimitDays ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge color={t.countsAgainstHourPool ? "amber" : "slate"}>
                          {t.countsAgainstHourPool ? "Desconta" : "Não desconta"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AbsenceTypeModal absenceType={t}>
                          <button
                            type="button"
                            title="Editar"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-300 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                          >
                            <Pencil size={13} />
                          </button>
                        </AbsenceTypeModal>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-900">Tipo de Ausência</h2>
          <p className="mb-3 text-xs text-stone-500">
            Crie um novo tipo ou clique no lápis numa linha da tabela para configurar um já existente —
            incluindo se exige documento comprovativo obrigatório.
          </p>
          <AbsenceTypeModal>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              <Plus size={14} /> Novo Tipo
            </button>
          </AbsenceTypeModal>
        </Card>
      </div>
    </div>
  );
}
