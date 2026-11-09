import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accessFor, canWrite } from "@/lib/roles";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { Building2 } from "lucide-react";
import { MedicinaTrabalhoTabs } from "../tabs";
import { EntidadesPanel } from "./entidades-panel";

export default async function EntidadesPage() {
  const user = await requireUser();
  const access = accessFor(user.roles, "medicina_trabalho");
  if (access === "own") redirect("/medicina-trabalho");
  if (access !== "rw" && access !== "ro") redirect("/dashboard");
  const canEdit = canWrite(user.roles, "medicina_trabalho");

  const entities = await prisma.workMedicineEntity.findMany({
    include: { addresses: { orderBy: { createdAt: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Medicina do Trabalho"
        description="Entidades parceiras e respetivas moradas para a realização de exames."
      />
      <MedicinaTrabalhoTabs />
      <EntidadesPanel
        canEdit={canEdit}
        initialEntities={entities.map((e) => ({
          id: e.id,
          name: e.name,
          nif: e.nif,
          active: e.active,
          addresses: e.addresses.map((a) => ({
            id: a.id,
            address: a.address,
            postalCode: a.postalCode,
          })),
        }))}
      />
    </div>
  );
}
