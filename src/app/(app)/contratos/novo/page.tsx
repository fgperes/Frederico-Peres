import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card } from "@/components/ui";
import { ContractProfileForm } from "../contract-profile-form";
import { getContractTypes } from "@/lib/contract-types";
import { redirect } from "next/navigation";
import { FileSignature } from "lucide-react";

export default async function NovoContratoPage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "contratos")) redirect("/contratos");

  const contractTypes = await getContractTypes();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        icon={FileSignature}
        title="Novo Contrato"
        description="Criar um novo perfil de contrato. Para atribuir a um colaborador, faça-o a partir da ficha do colaborador."
      />
      <Card>
        <ContractProfileForm contractTypes={contractTypes} />
      </Card>
    </div>
  );
}
