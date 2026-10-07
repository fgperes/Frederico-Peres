import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRead, canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { ColaboradorTabs } from "../tabs";
import { ReverseMovementButton } from "./reverse-movement-button";
import { notFound, redirect } from "next/navigation";
import { User } from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  TIME_CLOCK: "Decisão de picagens",
  ABSENCE: "Ausência",
};

export default async function ColaboradorBolsaHorasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!canRead(user.roles, "picagens")) redirect(`/colaboradores/${id}`);
  const scope = await employeeScopeWhere(user);

  const employee = await prisma.employee.findFirst({ where: { AND: [{ id }, scope] } });
  if (!employee) notFound();

  const canManage = canWrite(user.roles, "picagens");

  const movements = await prisma.hourPoolMovement.findMany({
    where: { employeeId: employee.id },
    include: { createdBy: true, reversedBy: true },
    orderBy: { date: "desc" },
  });

  const balanceMinutes = movements
    .filter((m) => !m.reversedAt)
    .reduce((sum, m) => sum + m.minutes, 0);
  const balanceHours = balanceMinutes / 60;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={User}
        title={`${employee.firstName} ${employee.lastName}`}
        description={employee.jobTitle}
      />

      <ColaboradorTabs employeeId={employee.id} />

      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Saldo atual</h2>
          <Badge color={balanceHours >= 0 ? "green" : "red"}>
            {balanceHours >= 0 ? "+" : ""}
            {balanceHours.toFixed(1)}h
          </Badge>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        {movements.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Sem movimentos na bolsa de horas." />
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3 text-center">Minutos</th>
                <th className="px-4 py-3">Estado</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {movements.map((m) => (
                <tr key={m.id} className={m.reversedAt ? "opacity-50" : ""}>
                  <td className="px-4 py-3">{m.date.toLocaleDateString("pt-PT")}</td>
                  <td className="px-4 py-3">{SOURCE_LABELS[m.source] ?? m.source}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">
                    {m.reason ?? "—"}
                    <span className="block text-xs text-stone-400 dark:text-stone-500">por {m.createdBy.name}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge color={m.minutes >= 0 ? "green" : "red"}>
                      {m.minutes >= 0 ? "+" : ""}
                      {m.minutes} min
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {m.reversedAt ? (
                      <span className="text-xs text-stone-400 dark:text-stone-500">
                        Anulado{m.reversedBy ? ` por ${m.reversedBy.name}` : ""}
                      </span>
                    ) : (
                      <Badge color="blue">Ativo</Badge>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      {!m.reversedAt && <ReverseMovementButton movementId={m.id} />}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
