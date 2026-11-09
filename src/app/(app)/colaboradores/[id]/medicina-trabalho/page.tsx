import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRead, canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ColaboradorTabs } from "../tabs";
import { User } from "lucide-react";
import { MedicinaTrabalhoEmployeePanel } from "./medicina-panel";

export default async function ColaboradorMedicinaTrabalhoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!canRead(user.roles, "medicina_trabalho")) redirect(`/colaboradores/${id}`);
  const scope = await employeeScopeWhere(user);

  const employee = await prisma.employee.findFirst({ where: { AND: [{ id }, scope] } });
  if (!employee) notFound();

  const canEdit = canWrite(user.roles, "medicina_trabalho");
  const employeeName = `${employee.firstName} ${employee.lastName}`;

  const [appointments, entities] = await Promise.all([
    prisma.workMedicineAppointment.findMany({
      where: { employeeId: employee.id },
      include: { entity: { select: { name: true } }, address: { select: { address: true } } },
      orderBy: { scheduledAt: "desc" },
    }),
    canEdit
      ? prisma.workMedicineEntity.findMany({
          where: { active: true },
          include: { addresses: { orderBy: { createdAt: "asc" } } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={User} title={employeeName} description={employee.jobTitle} />
      <ColaboradorTabs employeeId={employee.id} />
      <MedicinaTrabalhoEmployeePanel
        employeeId={employee.id}
        canEdit={canEdit}
        entities={entities.map((e) => ({
          id: e.id,
          name: e.name,
          addresses: e.addresses.map((a) => ({ id: a.id, address: a.address })),
        }))}
        initialAppointments={appointments.map((a) => ({
          id: a.id,
          employeeId: a.employeeId,
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
