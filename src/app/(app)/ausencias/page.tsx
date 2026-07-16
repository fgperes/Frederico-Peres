import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { PageHeader, Card, Badge, EmptyState, LinkButton } from "@/components/ui";
import { requestAbsence, decideAbsence, cancelAbsence } from "./actions";
import type { Prisma } from "@prisma/client";

const STATUS_COLOR: Record<string, "green" | "red" | "amber" | "slate"> = {
  APPROVED: "green",
  REJECTED: "red",
  PENDING: "amber",
  CANCELLED: "slate",
};

type AbsenceWithEmployeeAndType = Prisma.AbsenceGetPayload<{
  include: { employee: true; absenceType: true };
}>;

export default async function AusenciasPage() {
  const user = await requireUser();
  const canManage = canWrite(user.roles, "ausencias");
  const scope = await employeeScopeWhere(user);
  const year = new Date().getFullYear();

  const absenceTypes = await prisma.absenceType.findMany({ orderBy: { name: "asc" } });

  const [myBalances, myAbsences] = user.employeeId
    ? await Promise.all([
        prisma.absenceBalance.findMany({
          where: { employeeId: user.employeeId, year },
          include: { absenceType: true },
        }),
        prisma.absence.findMany({
          where: { employeeId: user.employeeId },
          include: { absenceType: true },
          orderBy: { startDate: "desc" },
          take: 15,
        }),
      ])
    : [[], []];

  let pendingApprovals: AbsenceWithEmployeeAndType[] = [];
  let teamCalendar: AbsenceWithEmployeeAndType[] = [];
  let reportByType: { name: string; days: number; count: number }[] = [];

  if (canManage) {
    const scopedEmployees = await prisma.employee.findMany({ where: scope });
    const scopedIds = scopedEmployees.map((e) => e.id);

    pendingApprovals = await prisma.absence.findMany({
      where: { employeeId: { in: scopedIds }, status: "PENDING" },
      include: { employee: true, absenceType: true },
      orderBy: { startDate: "asc" },
    });

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    teamCalendar = await prisma.absence.findMany({
      where: {
        employeeId: { in: scopedIds },
        status: { in: ["APPROVED", "PENDING"] },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      include: { employee: true, absenceType: true },
      orderBy: { startDate: "asc" },
    });

    const yearAbsences = await prisma.absence.findMany({
      where: { employeeId: { in: scopedIds }, status: "APPROVED", startDate: { gte: new Date(year, 0, 1) } },
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
        title="Ausências"
        description="Pedidos, aprovações, saldos e calendário de equipa."
        action={
          canManage ? <LinkButton href="/ausencias/tipos" variant="secondary">Tipos de Ausência</LinkButton> : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {user.employeeId && (
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Saldos ({year})</h2>
              {myBalances.length === 0 ? (
                <p className="text-xs text-slate-500">Sem saldos calculados ainda.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {myBalances.map((b) => (
                    <li key={b.id} className="flex justify-between">
                      <span>{b.absenceType.name}</span>
                      <span className="text-slate-500">
                        {(b.entitledDays - b.usedDays - b.plannedDays).toFixed(1)} / {b.entitledDays} dias
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Novo Pedido</h2>
              <form action={requestAbsence} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Tipo</label>
                  <select name="absenceTypeId" required className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                    {absenceTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Início</label>
                    <input name="startDate" type="date" required className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Fim</label>
                    <input name="endDate" type="date" required className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Motivo</label>
                  <input name="reason" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Documento comprovativo (nome do ficheiro)</label>
                  <input name="documentName" placeholder="atestado.pdf" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <button type="submit" className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Submeter pedido
                </button>
              </form>
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Meus Pedidos</h2>
              {myAbsences.length === 0 ? (
                <EmptyState message="Sem pedidos submetidos." />
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {myAbsences.map((a) => (
                    <li key={a.id} className="py-2">
                      <div className="flex items-center justify-between">
                        <span>
                          {a.absenceType.name} · {a.days}d
                        </span>
                        <Badge color={STATUS_COLOR[a.status]}>{a.status}</Badge>
                      </div>
                      <div className="text-xs text-slate-400">
                        {a.startDate.toLocaleDateString("pt-PT")} — {a.endDate.toLocaleDateString("pt-PT")}
                      </div>
                      {a.status === "PENDING" && (
                        <form action={cancelAbsence.bind(null, a.id)}>
                          <button type="submit" className="mt-1 text-xs text-red-600 hover:underline">
                            cancelar
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}

        {canManage && (
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                Pedidos Pendentes de Aprovação
              </h2>
              {pendingApprovals.length === 0 ? (
                <EmptyState message="Sem pedidos pendentes." />
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
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
                            <div className="text-xs text-slate-400">
                              {a.startDate.toLocaleDateString("pt-PT")} — {a.endDate.toLocaleDateString("pt-PT")}
                              {a.reason && ` · ${a.reason}`}
                            </div>
                            {overlapCount > 1 && (
                              <p className="mt-1 text-xs text-amber-600">
                                Atenção: {overlapCount} pedidos sobrepostos no mesmo departamento (AU-06).
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <form action={decideAbsence.bind(null, a.id, "APPROVED")} className="flex gap-2">
                            <input name="decisionNote" placeholder="Nota (opcional)" className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
                            <button type="submit" className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700">
                              Aprovar
                            </button>
                          </form>
                          <form action={decideAbsence.bind(null, a.id, "REJECTED")}>
                            <button type="submit" className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700">
                              Rejeitar
                            </button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                Calendário de Equipa (mês atual)
              </h2>
              {teamCalendar.length === 0 ? (
                <EmptyState message="Sem ausências este mês." />
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {teamCalendar.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2">
                      <span>
                        {a.employee.firstName} {a.employee.lastName} — {a.absenceType.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {a.startDate.toLocaleDateString("pt-PT")} — {a.endDate.toLocaleDateString("pt-PT")}
                      </span>
                      <Badge color={STATUS_COLOR[a.status]}>{a.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                Relatório de Absentismo ({year})
              </h2>
              {reportByType.length === 0 ? (
                <EmptyState message="Sem dados." />
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Tipo</th>
                      <th className="py-2">Pedidos</th>
                      <th className="py-2">Dias totais</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportByType.map((r) => (
                      <tr key={r.name}>
                        <td className="py-2">{r.name}</td>
                        <td className="py-2">{r.count}</td>
                        <td className="py-2">{r.days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
