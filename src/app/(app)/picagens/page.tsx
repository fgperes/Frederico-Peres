import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { getWeekStart, getWeekDays } from "@/lib/dates";
import { computeWorkedHours } from "@/lib/hours";
import { getTodayMealStatus } from "@/lib/meal-rules";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { ClockWidget } from "@/components/clock-widget";
import { JustifyForm } from "./justify-form";
import { LocationButton } from "./location-button";
import { reviewJustification } from "./actions";
import type { Prisma } from "@prisma/client";
import { Fingerprint } from "lucide-react";
import { formatDateTime } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  CLOCK_IN: "Entrada",
  CLOCK_OUT: "Saída",
  BREAK_START: "Início Refeição",
  BREAK_END: "Fim Refeição",
};

type TimeClockEntryWithEmployee = Prisma.TimeClockEntryGetPayload<{
  include: { employee: true };
}>;

export default async function PicagensPage() {
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "picagens");
  const scope = await employeeScopeWhere(user);

  const myEntries = user.employeeId
    ? await prisma.timeClockEntry.findMany({
        where: { employeeId: user.employeeId },
        orderBy: { timestamp: "desc" },
        take: 15,
      })
    : [];

  let mealStatus = null;
  if (user.employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      select: { weeklyHours: true },
    });
    mealStatus = await getTodayMealStatus(user.employeeId, employee?.weeklyHours ?? 40);
  }

  const weekStart = getWeekStart();
  const weekDays = getWeekDays(weekStart);
  const weekEnd = weekDays[6];
  weekEnd.setHours(23, 59, 59, 999);

  let deviationQueue: TimeClockEntryWithEmployee[] = [];
  let weeklyReport: { name: string; worked: number; contracted: number }[] = [];

  if (canEdit) {
    const scopedEmployees = await prisma.employee.findMany({ where: scope });
    const scopedIds = scopedEmployees.map((e) => e.id);

    deviationQueue = await prisma.timeClockEntry.findMany({
      where: {
        employeeId: { in: scopedIds },
        hasDeviation: true,
        justificationStatus: { in: ["PENDING"] },
      },
      include: { employee: true },
      orderBy: { timestamp: "desc" },
      take: 30,
    });

    const weekEntries = await prisma.timeClockEntry.findMany({
      where: { employeeId: { in: scopedIds }, timestamp: { gte: weekStart, lte: weekEnd } },
    });

    weeklyReport = scopedEmployees.map((e) => {
      const entries = weekEntries.filter((en) => en.employeeId === e.id);
      return {
        name: `${e.firstName} ${e.lastName}`,
        worked: computeWorkedHours(entries),
        contracted: e.weeklyHours,
      };
    });
  }

  return (
    <div>
      <PageHeader
        icon={Fingerprint}
        title="Picagens"
        description="Registo de assiduidade, desvios e banco de horas."
      />

      {user.employeeId && (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">
            Relógio de Ponto
          </h2>
          {mealStatus && <ClockWidget status={mealStatus} />}

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase text-stone-500">
              Registos recentes
            </h3>
            {myEntries.length === 0 ? (
              <EmptyState message="Sem registos ainda." />
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {myEntries.map((entry) => (
                  <li key={entry.id} className="py-2">
                    <div className="flex items-center justify-between">
                      <span>
                        {TYPE_LABELS[entry.type]} —{" "}
                        {formatDateTime(entry.timestamp)}
                      </span>
                      {entry.hasDeviation && (
                        <Badge color={entry.justificationStatus === "APPROVED" ? "green" : entry.justificationStatus === "REJECTED" ? "red" : "amber"}>
                          {entry.deviationType} · {entry.justificationStatus ?? "PENDENTE"}
                        </Badge>
                      )}
                    </div>
                    {entry.latitude != null && entry.longitude != null && (
                      <div className="mt-1">
                        <LocationButton
                          latitude={entry.latitude}
                          longitude={entry.longitude}
                          accuracy={entry.locationAccuracy}
                        />
                      </div>
                    )}
                    {entry.hasDeviation && !entry.justification && (
                      <JustifyForm entryId={entry.id} />
                    )}
                    {entry.justification && (
                      <p className="mt-1 text-xs text-stone-500">
                        Justificação: {entry.justification}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      {canEdit && (
        <>
          <Card className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-stone-900">
              Desvios por Aprovar
            </h2>
            {deviationQueue.length === 0 ? (
              <EmptyState message="Sem desvios pendentes de aprovação." />
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {deviationQueue.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between py-2">
                    <div>
                      <span className="font-medium">
                        {entry.employee.firstName} {entry.employee.lastName}
                      </span>{" "}
                      — {TYPE_LABELS[entry.type]} ·{" "}
                      <Badge color="amber">{entry.deviationType}</Badge>
                      <p className="text-xs text-stone-500">
                        {formatDateTime(entry.timestamp)} —{" "}
                        {entry.justification ?? "sem justificação"}
                      </p>
                      {entry.latitude != null && entry.longitude != null && (
                        <LocationButton
                          latitude={entry.latitude}
                          longitude={entry.longitude}
                          accuracy={entry.locationAccuracy}
                        />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <form action={reviewJustification.bind(null, entry.id, "APPROVED")}>
                        <button type="submit" className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                          Aprovar
                        </button>
                      </form>
                      <form action={reviewJustification.bind(null, entry.id, "REJECTED")}>
                        <button type="submit" className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700">
                          Rejeitar
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-900">
              Relatório Semanal de Assiduidade
            </h2>
            {weeklyReport.length === 0 ? (
              <EmptyState message="Sem dados para esta semana." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="py-2">Colaborador</th>
                      <th className="py-2">Horas trabalhadas</th>
                      <th className="py-2">Horas contratuais</th>
                      <th className="py-2">Banco de horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {weeklyReport.map((r, i) => {
                      const diff = r.worked - r.contracted;
                      return (
                        <tr key={i}>
                          <td className="py-2">{r.name}</td>
                          <td className="py-2">{r.worked.toFixed(1)}h</td>
                          <td className="py-2">{r.contracted.toFixed(1)}h</td>
                          <td className="py-2">
                            <Badge color={diff >= 0 ? "green" : "red"}>
                              {diff >= 0 ? "+" : ""}
                              {diff.toFixed(1)}h
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {!user.employeeId && !canEdit && (
        <EmptyState message="Não existe uma ficha de colaborador associada à sua conta." />
      )}
    </div>
  );
}
