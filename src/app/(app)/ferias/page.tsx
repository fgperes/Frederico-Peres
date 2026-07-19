import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRead, canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getOrCreateVacationBalance, computeHeadcount, effectiveStatus, toDateKey } from "@/lib/vacation";
import { PageHeader, EmptyState } from "@/components/ui";
import { FeriasTabs } from "./tabs";
import { CalendarPanel } from "./calendar-panel";
import { VacationHeadcountCard } from "./headcount-card";
import { EmployeePicker } from "./employee-picker";
import type { DayMark } from "./calendar";
import { redirect } from "next/navigation";
import { Plane } from "lucide-react";

export default async function FeriasPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; employeeId?: string }>;
}) {
  const user = await requireUser();
  if (!canRead(user.roles, "ferias")) redirect("/dashboard");

  const params = await searchParams;
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear();
  const canManage = canWrite(user.roles, "ferias");

  let targetEmployeeId: string | null = null;
  let isSelf = true;
  let pickerEmployees: { id: string; name: string }[] = [];

  if (canManage) {
    const scope = await employeeScopeWhere(user);
    const employees = await prisma.employee.findMany({
      where: scope,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    });
    pickerEmployees = employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }));

    if (params.employeeId && employees.some((e) => e.id === params.employeeId)) {
      targetEmployeeId = params.employeeId;
    } else {
      targetEmployeeId = null;
    }
    isSelf = targetEmployeeId === user.employeeId;
  } else {
    targetEmployeeId = user.employeeId ?? null;
    isSelf = true;
  }

  return (
    <div>
      <PageHeader
        icon={Plane}
        title="Férias"
        description={
          canManage
            ? "Marque dias de férias no calendário — o seu ou o de outro colaborador — e acompanhe o saldo do ano."
            : "Marque os seus dias de férias no calendário e acompanhe o saldo do ano."
        }
      />

      <FeriasTabs showTeamTabs={canManage} />

      {canManage && (
        <div className="mb-6">
          <EmployeePicker employees={pickerEmployees} selectedId={targetEmployeeId ?? ""} />
        </div>
      )}

      {!targetEmployeeId ? (
        <EmptyState
          icon={Plane}
          message={
            canManage
              ? "Selecione um colaborador acima para ver o respetivo calendário de férias."
              : "Sem ficha de colaborador associada — não tem calendário próprio."
          }
        />
      ) : (
        <FeriasCalendar employeeId={targetEmployeeId} year={year} isSelf={isSelf} />
      )}
    </div>
  );
}

async function FeriasCalendar({
  employeeId,
  year,
  isSelf,
}: {
  employeeId: string;
  year: number;
  isSelf: boolean;
}) {
  const { type, balance } = await getOrCreateVacationBalance(employeeId, year);
  const headcount = computeHeadcount(balance);

  const absences = await prisma.absence.findMany({
    where: {
      employeeId,
      absenceTypeId: type.id,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) },
    },
  });

  const marks: Record<string, DayMark> = {};
  for (const a of absences) {
    const key = toDateKey(a.startDate);
    marks[key] = { status: effectiveStatus(a) };
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <CalendarPanel year={year} marks={marks} interactive employeeId={employeeId} isSelf={isSelf} />
      </div>
      <VacationHeadcountCard title={`Resumo de férias — ${year}`} headcount={headcount} />
    </div>
  );
}
