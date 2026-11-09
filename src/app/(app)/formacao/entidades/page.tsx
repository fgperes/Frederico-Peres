import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accessFor, canWrite } from "@/lib/roles";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { Building2 } from "lucide-react";
import { FormacaoTabs } from "../tabs";
import { EntidadesFormacaoPanel } from "./entidades-panel";

export default async function EntidadesFormacaoPage() {
  const user = await requireUser();
  const access = accessFor(user.roles, "formacao");
  if (access === "own") redirect("/formacao");
  if (access !== "rw" && access !== "ro") redirect("/dashboard");
  const canEdit = canWrite(user.roles, "formacao");

  const entities = await prisma.trainingEntity.findMany({
    include: { addresses: { orderBy: { createdAt: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Formação"
        description="Entidades parceiras e respetivas moradas para a realização de formações."
      />
      <FormacaoTabs />
      <EntidadesFormacaoPanel
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
