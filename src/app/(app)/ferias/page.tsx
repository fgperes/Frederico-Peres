import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRead, canWrite } from "@/lib/roles";
import { getOrCreateVacationBalance, computeHeadcount } from "@/lib/vacation";
import { PageHeader, EmptyState, LinkButton } from "@/components/ui";
import { FeriasTabs } from "./tabs";
import { CalendarPanel } from "./calendar-panel";
import { VacationHeadcountCard } from "./headcount-card";
import type { DayMark } from "./calendar";
import { redirect } from "next/navigation";
import { Plane } from "lucide-react";

export default async function FeriasPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  if (!canRead(user.roles, "ferias")) redirect("/dashboard");

  const params = await searchParams;
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear();
  const canManage = canWrite(user.roles, "ferias");

  return (
    <div>
      <PageHeader
        icon={Plane}
        title="Férias"
        description="Marque os seus dias de férias no calendário e acompanhe o saldo do ano."
      />

      <FeriasTabs showTeamTabs={canManage} />

      {!user.employeeId ? (
        <div className="space-y-4">
          <EmptyState
            icon={Plane}
            message="Sem ficha de colaborador associada — não tem calendário próprio."
          />
          {canManage && (
            <div className="flex justify-center">
              <LinkButton href="/ferias/equipa">Ver calendário da equipa</LinkButton>
            </div>
          )}
        </div>
      ) : (
        <FeriasOwnCalendar employeeId={user.employeeId} year={year} />
      )}
    </div>
  );
}

async function FeriasOwnCalendar({ employeeId, year }: { employeeId: string; year: number }) {
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
    const key = a.startDate.toISOString().slice(0, 10);
    marks[key] = { status: a.status as "PENDING" | "APPROVED" };
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <CalendarPanel year={year} marks={marks} interactive />
      </div>
      <VacationHeadcountCard title={`Resumo de férias — ${year}`} headcount={headcount} />
    </div>
  );
}
