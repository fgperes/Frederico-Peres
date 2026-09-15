import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, LinkButton } from "@/components/ui";
import { ContractForm } from "../contract-form";
import { getContractTypes } from "@/lib/contract-types";
import { redirect } from "next/navigation";
import { FileSignature, Settings2 } from "lucide-react";

export default async function NovoContratoPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string; parentContractId?: string }>;
}) {
  const user = await requireUser();
  if (!canWrite(user.roles, "contratos")) redirect("/contratos");
  const params = await searchParams;

  const [employees, contractTypes] = await Promise.all([
    prisma.employee.findMany({ orderBy: { firstName: "asc" } }),
    getContractTypes(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        icon={FileSignature}
        title="Novo Contrato"
        description="Registar dados contratuais de um colaborador."
        action={
          <LinkButton href="/contratos/tipos" variant="secondary">
            <Settings2 size={14} /> Tipos de Contrato
          </LinkButton>
        }
      />
      <Card>
        <ContractForm
          employees={employees}
          contractTypes={contractTypes}
          defaultEmployeeId={params.employeeId}
          parentContractId={params.parentContractId}
        />
      </Card>
    </div>
  );
}
