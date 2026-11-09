import { requireUser } from "@/lib/session";
import { accessFor } from "@/lib/roles";
import { EmptyState } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function MedicinaTrabalhoPage() {
  const user = await requireUser();

  if (accessFor(user.roles, "medicina_trabalho") === "own") {
    if (user.employeeId) redirect(`/colaboradores/${user.employeeId}/medicina-trabalho`);
    return <EmptyState message="Não existe uma ficha de colaborador associada à sua conta." />;
  }

  redirect("/medicina-trabalho/entidades");
}
