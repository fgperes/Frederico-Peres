import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getVacationType, groupIntoPeriods, CANCEL_REQUEST_MARKER, type VacationDayRow } from "@/lib/vacation";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { FeriasTabs } from "../tabs";
import { ApprovalActions } from "./approval-actions";
import { redirect } from "next/navigation";
import { Plane, AlertTriangle } from "lucide-react";

export default async function FeriasAprovacoesPage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "ferias")) redirect("/ferias");

  const scope = await employeeScopeWhere(user);
  const scopedEmployees = await prisma.employee.findMany({
    where: scope,
    select: { id: true, firstName: true, lastName: true },
  });
  const scopedIds = scopedEmployees.map((e) => e.id);
  const nameOf = new Map(scopedEmployees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]));

  const type = await getVacationType().catch(() => null);
  const pendingAbsences = type
    ? await prisma.absence.findMany({
        where: {
          employeeId: { in: scopedIds },
          absenceTypeId: type.id,
          OR: [
            { status: "PENDING" },
            { status: "APPROVED", reason: CANCEL_REQUEST_MARKER },
          ],
        },
        orderBy: { startDate: "asc" },
      })
    : [];

  const rows: VacationDayRow[] = pendingAbsences.map((a) => ({
    id: a.id,
    employeeId: a.employeeId,
    employeeName: nameOf.get(a.employeeId) ?? "Colaborador",
    date: a.startDate,
    status: a.status,
    reason: a.reason,
  }));

  const periods = groupIntoPeriods(rows);

  // Sobreposição: só relevante entre pedidos novos (não faz sentido para
  // pedidos de cancelamento de férias já aprovadas).
  const requestPeriods = periods.filter((p) => p.kind === "PENDING");
  const overlapKeys = new Set<string>();
  for (let i = 0; i < requestPeriods.length; i++) {
    for (let j = i + 1; j < requestPeriods.length; j++) {
      const a = requestPeriods[i];
      const b = requestPeriods[j];
      if (a.employeeId === b.employeeId) continue;
      if (a.startDate <= b.endDate && b.startDate <= a.endDate) {
        overlapKeys.add(`${a.employeeId}-${a.startDate.toISOString()}`);
        overlapKeys.add(`${b.employeeId}-${b.startDate.toISOString()}`);
      }
    }
  }

  return (
    <div>
      <PageHeader
        icon={Plane}
        title="Férias"
        description="Períodos de férias pendentes de aprovação."
      />

      <FeriasTabs showTeamTabs />

      <Card>
        {periods.length === 0 ? (
          <EmptyState icon={Plane} message="Sem pedidos de férias pendentes." />
        ) : (
          <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-800">
            {periods.map((p) => {
              const key = `${p.employeeId}-${p.startDate.toISOString()}`;
              const overlaps = overlapKeys.has(key);
              const dayCount = p.absenceIds.length;
              return (
                <li key={key} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Badge color={p.kind === "CANCEL_PENDING" ? "amber" : "blue"}>
                        {p.kind === "CANCEL_PENDING" ? "Pedido de cancelamento" : "Pedido de férias"}
                      </Badge>{" "}
                      <span className="font-medium text-stone-900 dark:text-stone-100">
                        {p.employeeName}
                      </span>{" "}
                      <span className="text-stone-500 dark:text-stone-400">
                        — {dayCount} dia(s)
                      </span>
                      <div className="text-xs text-stone-500 dark:text-stone-400">
                        {p.startDate.toLocaleDateString("pt-PT")}
                        {p.startDate.getTime() !== p.endDate.getTime() &&
                          ` — ${p.endDate.toLocaleDateString("pt-PT")}`}
                      </div>
                      {overlaps && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <AlertTriangle size={12} />
                          Sobrepõe-se a férias de outro colaborador no mesmo período.
                        </p>
                      )}
                    </div>
                    <ApprovalActions absenceIds={p.absenceIds} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
