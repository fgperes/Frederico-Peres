import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { HorariosTabs } from "../tabs";
import { ImportDemandForm } from "./import-demand-form";
import { PredictiveForm } from "./predictive-form";
import { revertDemandImport } from "./actions";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

export default async function PreditivoPage() {
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "horarios");
  if (!canEdit) redirect("/horarios");

  const [imports, departments, demandCount] = await Promise.all([
    prisma.importLog.findMany({
      where: { type: "DEMAND" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.demandForecast.count(),
  ]);

  return (
    <div>
      <PageHeader
        icon={Sparkles}
        title="Módulo de Horários"
        description="Geração automática de horários com base em dados históricos e de procura."
      />
      <HorariosTabs />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-stone-900">
            Carregar Dados de Procura
          </h2>
          <p className="mb-3 text-xs text-stone-500">
            {demandCount} registos de procura carregados.{" "}
            <a href="/api/templates/procura" className="text-violet-700 hover:underline">
              Descarregar template
            </a>
          </p>
          <ImportDemandForm />

          {imports.length > 0 && (
            <div className="mt-4 border-t border-stone-100 pt-3">
              <h3 className="mb-2 text-xs font-semibold text-stone-700">
                Importações recentes
              </h3>
              <ul className="space-y-1.5 text-xs">
                {imports.map((log) => (
                  <li key={log.id} className="flex items-center justify-between">
                    <span className="text-stone-600">
                      {log.fileName} ({log.totalRows} linhas)
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge color={log.status === "REVERTED" ? "slate" : "green"}>
                        {log.status}
                      </Badge>
                      {log.status !== "REVERTED" && (
                        <form action={revertDemandImport.bind(null, log.id)}>
                          <button type="submit" className="text-rose-600 hover:underline">
                            reverter
                          </button>
                        </form>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-1 text-sm font-semibold text-stone-900">
            Motor Preditivo (modelo estatístico — médias móveis)
          </h2>
          <p className="mb-3 text-xs text-stone-500">
            Gera uma proposta de horário com base na média de procura histórica
            por dia da semana, respeitando disponibilidade, horas contratuais e
            ausências aprovadas. A proposta é criada em modo rascunho para
            simulação — nada é publicado automaticamente.
          </p>
          {demandCount === 0 ? (
            <EmptyState message="Carregue dados de procura para gerar propostas." />
          ) : (
            <PredictiveForm departments={departments} />
          )}
        </Card>
      </div>
    </div>
  );
}
