import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader } from "@/components/ui";
import { TemplateForm } from "../template-form";
import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

export default async function NovoModeloAvaliacaoPage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "avaliacoes")) redirect("/dashboard");

  const [teams, employees] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" }, include: { department: true } }),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={ClipboardCheck} title="Novo modelo de avaliação" />
      <TemplateForm
        teams={teams.map((t) => ({ id: t.id, name: t.name, departmentName: t.department.name }))}
        employees={employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }))}
      />
    </div>
  );
}
