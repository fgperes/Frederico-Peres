import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRead, canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge, EmptyState, LinkButton } from "@/components/ui";
import type { Prisma } from "@prisma/client";
import { PalmtreeIcon } from "lucide-react";
import { EmployeePicker } from "../ferias/employee-picker";
import { AbsenceCalendarPanel } from "./absence-calendar-panel";
import { CancelAbsenceButton } from "./cancel-absence-button";
import { DecideAbsenceActions } from "./decide-absence-actions";
import { isoDate } from "@/lib/dates";
import type { AbsenceDayMark } from "./absence-calendar";
import type { AbsenceSummary } from "./absence-request-modal";
import { redirect } from "next/navigation";

const STATUS_COLOR: Record<string, "green" | "red" | "amber" | "slate"> = {
  APPROVED: "green",
  REJECTED: "red",
  PENDING: "amber",
  CANCELLED: "slate",
};

type AbsenceWithEmployeeAndType = Prisma.AbsenceGetPayload<{
  include: { employee: true; absenceType: true };
}>;

export default async function AusenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string }>;
}) {
  const user = await requireUser();
  if (!canRead(user.roles, "ausencias")) redirect("/dashboard");

  const canManage = canWrite(user.roles, "ausencias");
  const scope = await employeeScopeWhere(user);
  const year = new Date().getFullYear();

  let targetEmployeeId: string | null = null;
  let isSelf = true;
  let pickerEmployees: { id: string; name: string }[] = [];

  if (canManage) {
    const employees = await prisma.employee.findMany({
      where: scope,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    });
    pickerEmployees = employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }));

    const params = await searchParams;
    if (params.employeeId && employees.some((e) => e.id === params.employeeId)) {
      targetEmployeeId = params.employeeId;
    } else {
      targetEmployeeId = user.employeeId ?? null;
    }
    isSelf = targetEmployeeId === user.employeeId;
  } else {
    targetEmployeeId = user.employeeId ?? null;
    isSelf = true;
  }

  const absenceTypes = await prisma.absenceType.findMany({
    where: { isVacation: false },
    orderBy: { name: "asc" },
  });
  const absenceTypeOptions = absenceTypes.map((t) => ({
    id: t.id,
    name: t.name,
    unitType: t.unitType,
    requiresDocument: t.requiresDocument,
  }));

  let employeeName = "";
  let absenceSummaries: AbsenceSummary[] = [];
  const marks: Record<string, AbsenceDayMark> = {};

  if (targetEmployeeId) {
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: targetEmployeeId },
      select: { firstName: true, lastName: true },
    });
    employeeName = `${employee.firstName} ${employee.lastName}`;

    const rows = await prisma.absence.findMany({
      where: { employeeId: targetEmployeeId, absenceType: { isVacation: false } },
      include: { absenceType: true },
      orderBy: { startDate: "desc" },
    });
    absenceSummaries = rows.map((a) => ({
      id: a.id,
      absenceTypeId: a.absenceTypeId,
      typeName: a.absenceType.name,
      startDate: isoDate(a.startDate),
      endDate: isoDate(a.endDate),
      days: a.days,
      status: a.status as AbsenceSummary["status"],
      reason: a.reason,
      documentName: a.documentName,
      documentData: a.documentData,
      decisionNote: a.decisionNote,
    }));

    for (const a of absenceSummaries) {
      if (a.status === "CANCELLED") continue;
      const cursor = new Date(`${a.startDate}T00:00:00`);
      const end = new Date(`${a.endDate}T00:00:00`);
      while (cursor <= end) {
        if (cursor.getFullYear() === year) {
          marks[isoDate(cursor)] = { status: a.status, typeName: a.typeName, absenceId: a.id };
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  let pendingApprovals: AbsenceWithEmployeeAndType[] = [];
  let teamCalendar: AbsenceWithEmployeeAndType[] = [];
  let reportByType: { name: string; days: number; count: number }[] = [];

  if (canManage) {
    const scopedEmployees = await prisma.employee.findMany({ where: scope });
    const scopedIds = scopedEmployees.map((e) => e.id);

    pendingApprovals = await prisma.absence.findMany({
      where: { employeeId: { in: scopedIds }, status: "PENDING", absenceType: { isVacation: false } },
      include: { employee: true, absenceType: true },
      orderBy: { startDate: "asc" },
    });

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    teamCalendar = await prisma.absence.findMany({
      where: {
        employeeId: { in: scopedIds },
        status: { in: ["APPROVED", "PENDING"] },
        absenceType: { isVacation: false },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      include: { employee: true, absenceType: true },
      orderBy: { startDate: "asc" },
    });

    const yearAbsences = await prisma.absence.findMany({
      where: {
        employeeId: { in: scopedIds },
        status: "APPROVED",
        absenceType: { isVacation: false },
        startDate: { gte: new Date(year, 0, 1) },
      },
      include: { absenceType: true },
    });
    const grouped = new Map<string, { days: number; count: number }>();
    for (const a of yearAbsences) {
      const key = a.absenceType.name;
      const curr = grouped.get(key) ?? { days: 0, count: 0 };
      curr.days += a.days;
      curr.count += 1;
      grouped.set(key, curr);
    }
    reportByType = Array.from(grouped.entries()).map(([name, v]) => ({ name, ...v }));
  }

  return (
    <div>
      <PageHeader
        icon={PalmtreeIcon}
        title="Ausências"
        description={
          canManage
            ? "Marque dias de ausência no calendário — o seu ou o de outro colaborador — com pedidos, aprovações e saldos."
            : "Marque os seus dias de ausência no calendário e acompanhe os saldos e pedidos."
        }
        action={
          canManage ? <LinkButton href="/ausencias/tipos" variant="secondary">Tipos de Ausência</LinkButton> : undefined
        }
      />

      {canManage && (
        <div className="mb-6">
          <EmployeePicker employees={pickerEmployees} selectedId={targetEmployeeId ?? ""} basePath="/ausencias" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {!targetEmployeeId ? (
            <Card>
              <EmptyState
                icon={PalmtreeIcon}
                message={
                  canManage
                    ? "Selecione um colaborador acima para ver o respetivo calendário de ausências."
                    : "Sem ficha de colaborador associada — não tem calendário próprio."
                }
              />
            </Card>
          ) : (
            <div className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
              <AbsenceCalendarPanel
                year={year}
                marks={marks}
                absences={absenceSummaries}
                absenceTypes={absenceTypeOptions}
                interactive
                employeeId={targetEmployeeId}
                employeeName={employeeName}
                isSelf={isSelf}
              />
            </div>
          )}

          {canManage && (
            <>
              <Card>
                <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Pedidos Pendentes de Aprovação</h2>
                {pendingApprovals.length === 0 ? (
                  <EmptyState message="Sem pedidos pendentes." />
                ) : (
                  <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-800">
                    {pendingApprovals.map((a) => {
                      const overlapCount = pendingApprovals.filter(
                        (o) =>
                          o.id !== a.id &&
                          o.employee.departmentId === a.employee.departmentId &&
                          o.startDate <= a.endDate &&
                          o.endDate >= a.startDate
                      ).length;
                      return (
                        <li key={a.id} className="py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">
                                {a.employee.firstName} {a.employee.lastName}
                              </span>{" "}
                              — {a.absenceType.name} ({a.days}d)
                              <div className="text-xs text-stone-500 dark:text-stone-400">
                                {a.startDate.toLocaleDateString("pt-PT")} — {a.endDate.toLocaleDateString("pt-PT")}
                                {a.reason && ` · ${a.reason}`}
                              </div>
                              {a.documentName && (
                                <a
                                  href={a.documentData ?? undefined}
                                  download={a.documentName}
                                  className="mt-0.5 inline-block text-xs text-violet-700 underline dark:text-violet-400"
                                >
                                  Comprovativo: {a.documentName}
                                </a>
                              )}
                              {overlapCount > 1 && (
                                <p className="mt-1 text-xs text-amber-600">
                                  Atenção: {overlapCount} pedidos sobrepostos no mesmo departamento (AU-06).
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-2">
                            <DecideAbsenceActions absenceId={a.id} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              <Card>
                <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Calendário de Equipa (mês atual)</h2>
                {teamCalendar.length === 0 ? (
                  <EmptyState message="Sem ausências este mês." />
                ) : (
                  <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-800">
                    {teamCalendar.map((a) => (
                      <li key={a.id} className="flex items-center justify-between py-2">
                        <span>
                          {a.employee.firstName} {a.employee.lastName} — {a.absenceType.name}
                        </span>
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                          {a.startDate.toLocaleDateString("pt-PT")} — {a.endDate.toLocaleDateString("pt-PT")}
                        </span>
                        <Badge color={STATUS_COLOR[a.status]}>{a.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Relatório de Absentismo ({year})</h2>
                {reportByType.length === 0 ? (
                  <EmptyState message="Sem dados." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[360px] text-left text-sm">
                      <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 dark:border-stone-800">
                        <tr>
                          <th className="py-2">Tipo</th>
                          <th className="py-2">Pedidos</th>
                          <th className="py-2">Dias totais</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {reportByType.map((r) => (
                          <tr key={r.name}>
                            <td className="py-2">{r.name}</td>
                            <td className="py-2">{r.count}</td>
                            <td className="py-2">{r.days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>

        {targetEmployeeId && (
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
                {isSelf ? "Meus Pedidos" : `Pedidos de ${employeeName}`}
              </h2>
              {absenceSummaries.length === 0 ? (
                <EmptyState message="Sem pedidos submetidos." />
              ) : (
                <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-800">
                  {absenceSummaries.slice(0, 15).map((a) => (
                    <li key={a.id} className="py-2">
                      <div className="flex items-center justify-between">
                        <span>
                          {a.typeName} · {a.days}d
                        </span>
                        <Badge color={STATUS_COLOR[a.status]}>{a.status}</Badge>
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400">
                        {new Date(`${a.startDate}T00:00:00`).toLocaleDateString("pt-PT")} —{" "}
                        {new Date(`${a.endDate}T00:00:00`).toLocaleDateString("pt-PT")}
                      </div>
                      {a.status === "PENDING" && <CancelAbsenceButton absenceId={a.id} />}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
