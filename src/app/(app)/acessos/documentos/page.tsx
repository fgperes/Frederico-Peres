import { requireUser } from "@/lib/session";
import { isSystemAdmin } from "@/lib/roles";
import { getDocumentBranding } from "@/lib/document-branding";
import { PageHeader, Card } from "@/components/ui";
import { AcessosTabs } from "../tabs";
import { ClientLogoPicker } from "./client-logo-picker";
import { ClientNameForm } from "./client-name-form";
import { LogoMark, PeopleWordmark } from "@/components/brand/logo";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";

export default async function DocumentosPage() {
  const user = await requireUser();
  if (!isSystemAdmin(user.roles)) redirect("/acessos");

  const branding = await getDocumentBranding();

  return (
    <div>
      <PageHeader
        icon={FileText}
        title="Perfis e Acessos"
        description="Identidade visual usada no cabeçalho dos documentos para download."
      />

      <AcessosTabs showDocumentos showFeriados />

      <Card className="mb-6">
        <h2 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Empresa cliente
        </h2>
        <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
          A people4people fica sempre do lado esquerdo do cabeçalho dos documentos exportados
          (ex.: PDF de escalas). Do lado direito aparece a informação da vossa empresa que
          configurar aqui.
        </p>
        <div className="space-y-4">
          <ClientNameForm currentName={branding.clientCompanyName} />
          <div>
            <p className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
              Logótipo da empresa cliente
            </p>
            <ClientLogoPicker currentLogo={branding.clientCompanyLogo} />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Pré-visualização do cabeçalho
        </h2>
        <div className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                <LogoMark className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <PeopleWordmark className="text-sm text-stone-900 dark:text-stone-100" />
                <p className="text-[10px] text-stone-500 dark:text-stone-400">SGRH</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {branding.clientCompanyLogo ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URI, não é um asset otimizável pelo next/image
                <img src={branding.clientCompanyLogo} alt="" className="max-h-8 max-w-[6rem] object-contain" />
              ) : branding.clientCompanyName ? (
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  {branding.clientCompanyName}
                </span>
              ) : (
                <span className="text-xs italic text-stone-400">Sem empresa cliente configurada</span>
              )}
            </div>
          </div>
          <div className="border-t border-stone-100 pt-3 dark:border-stone-800">
            <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">Escala mensal — Setembro de 2026</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">Todos os departamentos</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
