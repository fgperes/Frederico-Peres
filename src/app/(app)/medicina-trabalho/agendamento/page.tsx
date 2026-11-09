import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accessFor, canWrite } from "@/lib/roles";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { CalendarClock } from "lucide-react";
import { MedicinaTrabalhoTabs } from "../tabs";
import { AgendamentoPanel } from "./agendamento-panel";

export default async function AgendamentoPage() {
  const user = await requireUser();
  const access = accessFor(user.roles, "medicina_trabalho");
  if (access === "own") redirect("/medicina-trabalho");
  if (access !== "rw" && access !== "ro") redirect("/dashboard");
  const canEdit = canWrite(user.roles, "medicina_trabalho");

  const [appointments, entities, employees] = await Promise.all([
    prisma.workMedicineAppointment.findMany({
      include: {
        employee: { select: { firstName: true, lastName: true } },
        entity: { select: { name: true } },
        address: { select: { address: true } },
      },
      orderBy: { scheduledAt: "desc" },
      take: 200,
    }),
    prisma.workMedicineEntity.findMany({
      where: { active: true },
      include: { addresses: { orderBy: { createdAt: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        icon={CalendarClock}
        title="Medicina do Trabalho"
        description="Agendamento e acompanhamento dos processos de medicina do trabalho."
      />
      <MedicinaTrabalhoTabs />
      <AgendamentoPanel
        canEdit={canEdit}
        entities={entities.map((e) => ({
          id: e.id,
          name: e.name,
          addresses: e.addresses.map((a) => ({ id: a.id, address: a.address })),
        }))}
        employees={employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }))}
        initialAppointments={appointments.map((a) => ({
          id: a.id,
          employeeId: a.employeeId,
          employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
          entityId: a.entityId,
          entityName: a.entity?.name ?? null,
          addressId: a.addressId,
          addressLabel: a.address?.address ?? null,
          scheduledAt: a.scheduledAt.toISOString(),
          status: a.status,
          resultStatus: a.resultStatus,
          resultNotes: a.resultNotes,
          resultDocumentName: a.resultDocumentName,
          resultDocumentData: a.resultDocumentData,
        }))}
      />
    </div>
  );
}
