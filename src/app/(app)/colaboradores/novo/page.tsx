import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { EmployeeForm } from "../employee-form";
import { createEmployee } from "../actions";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

export default async function NovoColaboradorPage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "recursos")) {
    redirect("/colaboradores");
  }

  const [departments, teams, locations, managers] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({ orderBy: { firstName: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={UserPlus}
        title="Novo Colaborador"
        description="Criar uma nova ficha de colaborador."
      />
      <Card>
        <EmployeeForm
          action={createEmployee}
          departments={departments}
          teams={teams}
          locations={locations}
          managers={managers}
        />
      </Card>
    </div>
  );
}
