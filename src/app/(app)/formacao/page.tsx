import { requireUser } from "@/lib/session";
import { accessFor } from "@/lib/roles";
import { EmptyState } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function FormacaoPage() {
  const user = await requireUser();

  if (accessFor(user.roles, "formacao") === "own") {
    if (user.employeeId) redirect(`/colaboradores/${user.employeeId}/formacao`);
    return <EmptyState message="Não existe uma ficha de colaborador associada à sua conta." />;
  }

  redirect("/formacao/formacoes");
}
