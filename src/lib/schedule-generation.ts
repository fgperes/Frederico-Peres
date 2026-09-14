import { prisma } from "@/lib/prisma";
import { addDays, differenceInCalendarDays } from "date-fns";
import { getWeekStart, isoDate } from "@/lib/dates";
import { shiftDurationHours, minutesFromMidnight, shiftEndOffsetMinutes } from "@/lib/schedule";
import { getModuleSubscription } from "@/lib/subscriptions";

export const MIN_GENERATION_RANGE_DAYS = 7;
const MIN_REST_MINUTES = 11 * 60; // Código do Trabalho, art.º 214.º
// Capacidade de atendimento por colaborador usada para dimensionar os
// turnos de origem preditiva a partir da procura histórica — heurística
// simples (médias por janela horária) enquanto o modelo Erlang C definitivo
// (em preparação) não é integrado.
const DEFAULT_CAPACITY_PER_EMPLOYEE = 10;

type Window = { label: string; startHour: number; endHour: number };
const WINDOWS: Window[] = [
  { label: "Manhã", startHour: 6, endHour: 14 },
  { label: "Tarde", startHour: 14, endHour: 22 },
  { label: "Noite", startHour: 22, endHour: 30 }, // 22h-06h
];

export type GenerationIssue = { employeeId: string; employeeName: string; message: string };

export type GenerationResult = {
  created: number;
  skippedDueToAbsence: number;
  issues: GenerationIssue[];
};

function enumerateDates(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  let d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (d.getTime() <= end.getTime()) {
    days.push(new Date(d));
    d = addDays(d, 1);
  }
  return days;
}

function weekKeyOf(d: Date): string {
  return isoDate(getWeekStart(isoDate(d)));
}

type AssignedShift = { date: Date; startTime: string; endTime: string };

// Código do Trabalho, art.º 214.º — descanso mínimo entre jornadas de 11h.
// Só compara com o turno do dia imediatamente anterior (dias não
// consecutivos nunca violam este limite).
function violatesRest(prev: AssignedShift | undefined, next: AssignedShift): boolean {
  if (!prev) return false;
  if (differenceInCalendarDays(next.date, prev.date) !== 1) return false;
  const prevEndOffset = shiftEndOffsetMinutes(prev.startTime, prev.endTime);
  const nextStartOffset = 24 * 60 + minutesFromMidnight(next.startTime);
  return nextStartOffset - prevEndOffset < MIN_REST_MINUTES;
}

// Motor de geração de escalas usado pelo módulo Escalas. Para cada
// colaborador selecionado, cruza 4 fontes: (1) limites do contrato ativo
// (horas semanais, folgas semanais), (2) a fonte de horário definida do
// colaborador — um ciclo atribuído tem sempre preferência sobre o módulo
// preditivo, e a cobertura já dada por ciclos é descontada da procura
// preditiva do mesmo departamento/dia/janela, (3) os limites legais já
// validados noutros pontos da aplicação (descanso de 11h, máx. 40h/semana,
// folgas semanais) e (4) ausências/férias aprovadas, que bloqueiam
// especificamente os dias em causa. Nunca sobrepõe um turno já existente.
export async function generateSchedulesForEmployees(
  from: Date,
  to: Date,
  employeeIds: string[]
): Promise<GenerationResult> {
  const days = enumerateDates(from, to);
  const issues: GenerationIssue[] = [];
  let created = 0;
  let skippedDueToAbsence = 0;

  const employees = await prisma.employee.findMany({ where: { id: { in: employeeIds } } });
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  const [cycleAssignments, contracts, absences, existingShiftsInDept, moduleSub, templates] =
    await Promise.all([
      prisma.scheduleCycleAssignment.findMany({
        where: { employeeId: { in: employeeIds }, cycle: { isTemplate: false } },
        include: { cycle: { include: { pattern: true } } },
      }),
      prisma.contract.findMany({
        where: { employeeId: { in: employeeIds }, status: "ACTIVE" },
        orderBy: { startDate: "desc" },
      }),
      prisma.absence.findMany({
        where: { employeeId: { in: employeeIds }, status: "APPROVED", startDate: { lte: to }, endDate: { gte: from } },
      }),
      prisma.shift.findMany({ where: { date: { gte: from, lte: to } } }),
      getModuleSubscription(),
      prisma.shiftTemplate.findMany(),
    ]);

  const cycleAssignmentByEmployee = new Map(cycleAssignments.map((a) => [a.employeeId, a]));
  const contractByEmployee = new Map<string, (typeof contracts)[number]>();
  for (const c of contracts) if (!contractByEmployee.has(c.employeeId)) contractByEmployee.set(c.employeeId, c);

  function isAbsent(employeeId: string, day: Date): boolean {
    return absences.some((a) => a.employeeId === employeeId && a.startDate <= day && a.endDate >= day);
  }

  // Turnos ocupados por colaborador — pré-existentes + os que vamos criando
  // nesta geração — usados para não sobrepor, para contar dias de trabalho
  // por semana (folgas) e para o cálculo do descanso de 11h.
  const shiftsByEmployee = new Map<string, AssignedShift[]>();
  for (const s of existingShiftsInDept) {
    const arr = shiftsByEmployee.get(s.employeeId) ?? [];
    arr.push({ date: s.date, startTime: s.startTime, endTime: s.endTime });
    shiftsByEmployee.set(s.employeeId, arr);
  }

  function hasShiftOn(employeeId: string, day: Date): boolean {
    return (shiftsByEmployee.get(employeeId) ?? []).some((s) => isoDate(s.date) === isoDate(day));
  }

  function workingDaysInWeek(employeeId: string, week: string): number {
    return (shiftsByEmployee.get(employeeId) ?? []).filter((s) => weekKeyOf(s.date) === week).length;
  }

  function lastAssignedBefore(employeeId: string, day: Date): AssignedShift | undefined {
    return (shiftsByEmployee.get(employeeId) ?? [])
      .filter((s) => s.date.getTime() < day.getTime())
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  }

  async function commitShift(employeeId: string, day: Date, template: { id: string; startTime: string; endTime: string }, source: "CYCLE" | "PREDICTIVE", notes?: string) {
    await prisma.shift.create({
      data: {
        employeeId,
        date: day,
        startTime: template.startTime,
        endTime: template.endTime,
        shiftTemplateId: template.id,
        source,
        status: "DRAFT",
        notes,
      },
    });
    created++;
    const arr = shiftsByEmployee.get(employeeId) ?? [];
    arr.push({ date: day, startTime: template.startTime, endTime: template.endTime });
    shiftsByEmployee.set(employeeId, arr);
  }

  // --- Fase 1: colaboradores com ciclo atribuído — o ciclo tem sempre
  // preferência sobre o preditivo. ---
  for (const employeeId of employeeIds) {
    const assignment = cycleAssignmentByEmployee.get(employeeId);
    if (!assignment) continue;
    const employee = employeeById.get(employeeId)!;
    const employeeName = `${employee.firstName} ${employee.lastName}`;
    const cycle = assignment.cycle;

    for (const day of days) {
      if (isAbsent(employeeId, day)) {
        skippedDueToAbsence++;
        continue;
      }
      if (hasShiftOn(employeeId, day)) continue;

      const daysSinceStart = differenceInCalendarDays(day, cycle.startDate);
      if (daysSinceStart < 0) continue; // dia anterior ao início do ciclo

      const weekOffset = Math.floor(daysSinceStart / 7) + assignment.offsetWeeks;
      const cycleWeekIndex = ((weekOffset % cycle.weeks) + cycle.weeks) % cycle.weeks;
      const dow = day.getDay();
      const cell = cycle.pattern.find((p) => p.weekIndex === cycleWeekIndex && p.dayOfWeek === dow);
      if (!cell || cell.isDayOff || !cell.shiftTemplateId) continue;

      const template = templates.find((t) => t.id === cell.shiftTemplateId);
      if (!template) {
        issues.push({ employeeId, employeeName, message: `${employeeName}: modelo de turno do ciclo já não existe.` });
        continue;
      }

      await commitShift(employeeId, day, template, "CYCLE");
    }
  }

  // --- Fase 2: colaboradores sem ciclo — via módulo preditivo, com a
  // cobertura já dada por ciclos (fase 1) a ajustar a procura em falta. ---
  const predictiveCandidates = employeeIds.filter((id) => !cycleAssignmentByEmployee.has(id));
  if (predictiveCandidates.length > 0) {
    const lookbackStart = addDays(from, -8 * 7);
    const history = await prisma.demandForecast.findMany({ where: { date: { gte: lookbackStart, lt: from } } });

    const templateForWindow = (win: Window) =>
      templates.find((t) => {
        const h = Number(t.startTime.split(":")[0]);
        const normalizedHour = h < win.startHour && win.endHour > 24 ? h + 24 : h;
        return normalizedHour >= win.startHour && normalizedHour < win.endHour;
      }) ?? templates[0];

    for (const employeeId of predictiveCandidates) {
      const employee = employeeById.get(employeeId)!;
      const employeeName = `${employee.firstName} ${employee.lastName}`;
      const contract = contractByEmployee.get(employeeId);

      if (!contract) {
        issues.push({
          employeeId,
          employeeName,
          message: `${employeeName}: sem contrato ativo — não é possível gerar horário (defina o contrato em Colaboradores → Contratos).`,
        });
        continue;
      }
      if (!moduleSub.predictiveEnabled) {
        issues.push({
          employeeId,
          employeeName,
          message: `${employeeName}: sem ciclo de horário atribuído, e o módulo preditivo está desativado. Atribua um ciclo em Horários → Ciclos ou peça ao Administrador do Sistema para ativar o módulo preditivo.`,
        });
        continue;
      }
      if (!employee.departmentId) {
        issues.push({
          employeeId,
          employeeName,
          message: `${employeeName}: sem departamento definido — não é possível associar dados de procura.`,
        });
        continue;
      }

      const deptHistory = history.filter((h) => h.departmentId === employee.departmentId);
      if (deptHistory.length === 0) {
        issues.push({
          employeeId,
          employeeName,
          message: `${employeeName}: sem ciclo atribuído e sem dados de procura importados para o departamento (Horários → Preditivo).`,
        });
        continue;
      }

      if (!templates.length) {
        issues.push({ employeeId, employeeName, message: `${employeeName}: não existem modelos de turno configurados.` });
        continue;
      }

      const weeklyHoursAssigned = new Map<string, number>();
      for (const s of shiftsByEmployee.get(employeeId) ?? []) {
        const week = weekKeyOf(s.date);
        const hours = shiftDurationHours(s.startTime, s.endTime, 0);
        weeklyHoursAssigned.set(week, (weeklyHoursAssigned.get(week) ?? 0) + hours);
      }

      for (const day of days) {
        if (isAbsent(employeeId, day)) {
          skippedDueToAbsence++;
          continue;
        }
        if (hasShiftOn(employeeId, day)) continue;

        const week = weekKeyOf(day);
        const maxWorkingDays = 7 - contract.weeklyRestDays;
        if (workingDaysInWeek(employeeId, week) >= maxWorkingDays) continue; // já cumpriu as folgas mínimas

        const dow = day.getDay();
        const sameWeekdayHistory = deptHistory.filter((h) => h.date.getDay() === dow);

        for (const win of WINDOWS) {
          const template = templateForWindow(win);
          if (!template) continue;

          const hoursForWindow = shiftDurationHours(template.startTime, template.endTime, template.breakMins);
          const weekHours = weeklyHoursAssigned.get(week) ?? 0;
          if (weekHours + hoursForWindow > contract.weeklyHours) continue;

          if (violatesRest(lastAssignedBefore(employeeId, day), { date: day, startTime: template.startTime, endTime: template.endTime })) {
            continue;
          }

          const relevantHours = sameWeekdayHistory.filter((h) => {
            const hour = h.hour < win.startHour && win.endHour > 24 ? h.hour + 24 : h.hour;
            return hour >= win.startHour && hour < win.endHour;
          });
          const avgDemand =
            relevantHours.length > 0
              ? relevantHours.reduce((sum, h) => sum + h.demandValue, 0) / relevantHours.length
              : 0;
          if (avgDemand <= 0) continue;
          const required = Math.max(1, Math.ceil(avgDemand / DEFAULT_CAPACITY_PER_EMPLOYEE));

          // Desconta a cobertura já dada por colaboradores de ciclo (fase 1)
          // e por outros turnos preditivos já atribuídos nesta janela/dia.
          const alreadyCovered = [...shiftsByEmployee.entries()].filter(([empId, shifts]) => {
            if (empId === employeeId) return false;
            const other = employeeById.get(empId);
            if (!other || other.departmentId !== employee.departmentId) return false;
            return shifts.some((s) => {
              if (isoDate(s.date) !== isoDate(day)) return false;
              const h = minutesFromMidnight(s.startTime) / 60;
              const normalizedHour = h < win.startHour && win.endHour > 24 ? h + 24 : h;
              return normalizedHour >= win.startHour && normalizedHour < win.endHour;
            });
          }).length;

          if (alreadyCovered >= required) continue; // já coberto (ex.: por ciclos)

          weeklyHoursAssigned.set(week, weekHours + hoursForWindow);
          await commitShift(
            employeeId,
            day,
            template,
            "PREDICTIVE",
            `Proposta preditiva — procura média ${avgDemand.toFixed(1)} (${win.label})`
          );
          break; // um turno por dia
        }
      }
    }
  }

  return { created, skippedDueToAbsence, issues };
}
