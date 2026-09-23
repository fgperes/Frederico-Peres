import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { getContractTypes } from "@/lib/contract-types";
import { redirect } from "next/navigation";
import { FileSignature } from "lucide-react";
import { ContractTypeForm } from "./contract-type-form";
import { DeleteContractTypeButton } from "./delete-contract-type-button";

export default async function TiposContratoPage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "contratos")) redirect("/contratos");

  const types = await getContractTypes();

  return (
    <div>
      <PageHeader
        icon={FileSignature}
        title="Tipos de Contrato"
        description="Configuração dos tipos de contrato disponíveis ao registar contratos."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-0">
          {types.length === 0 ? (
            <div className="p-6"><EmptyState message="Sem tipos configurados." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Origem</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {types.map((t) => (
                    <tr key={t.key}>
                      <td className="px-4 py-3 font-medium">{t.label}</td>
                      <td className="px-4 py-3">
                        <Badge color={t.isSystem ? "slate" : "green"}>
                          {t.isSystem ? "Sistema" : "Personalizado"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!t.isSystem && <DeleteContractTypeButton contractTypeId={t.id} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-900">Novo Tipo</h2>
          <ContractTypeForm />
        </Card>
      </div>
    </div>
  );
}
