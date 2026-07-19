import { requireUser } from "@/lib/session";
import { canWrite, canManageEmployeeAccess } from "@/lib/roles";
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

  const [departments, teams, locations, managers, jobTitleRows] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({ orderBy: { firstName: "asc" } }),
    prisma.employee.findMany({
      distinct: ["jobTitle"],
      select: { jobTitle: true },
      orderBy: { jobTitle: "asc" },
    }),
  ]);
  const jobTitles = jobTitleRows.map((r) => r.jobTitle);

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
          jobTitles={jobTitles}
          canCreateUser={canManageEmployeeAccess(user.roles)}
        />
      </Card>
    </div>
  );
}
