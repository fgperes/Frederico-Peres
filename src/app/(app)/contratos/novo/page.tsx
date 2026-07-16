import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { ContractForm } from "../contract-form";
import { redirect } from "next/navigation";
import { FileSignature } from "lucide-react";

export default async function NovoContratoPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string; parentContractId?: string }>;
}) {
  const user = await requireUser();
  if (!canWrite(user.roles, "contratos")) redirect("/contratos");
  const params = await searchParams;

  const employees = await prisma.employee.findMany({ orderBy: { firstName: "asc" } });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader icon={FileSignature} title="Novo Contrato" description="Registar dados contratuais de um colaborador." />
      <Card>
        <ContractForm
          employees={employees}
          defaultEmployeeId={params.employeeId}
          parentContractId={params.parentContractId}
        />
      </Card>
    </div>
  );
}
