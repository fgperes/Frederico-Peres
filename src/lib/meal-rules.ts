import { prisma } from "@/lib/prisma";
import { isoDate } from "@/lib/dates";
import { logAudit } from "@/lib/audit";

// Regra de negócio (pausa de refeição):
// - Turnos com menos de 5h de carga diária não têm direito a pausa de
//   refeição, pelo que os botões de refeição nem sequer aparecem.
// - Para turnos >= 5h, o botão "Início Refeição" só fica disponível quando
//   faltam 6h para terminar o turno (contando turno + 1h de refeição).
//   Ex.: turno de 6h (+1h refeição = 7h de span) → disponível ao fim da 1ª
//   hora. Turno de 8h (+1h = 9h de span) → disponível ao fim da 3ª hora.
// - Se o colaborador ultrapassar 5h em turno sem iniciar a refeição, é
//   mostrado um lembrete (que pode dispensar) e são criadas tarefas para o
//   gestor de RH e o supervisor direto ajustarem a escala. Essa deteção
//   fica registada no turno (Shift.mealAlertAt).

export type ClockPhase =
  | "NOT_CLOCKED_IN"
  | "WORKING"
  | "MEAL_AVAILABLE"
  | "ON_MEAL"
  | "AFTER_MEAL"
  | "CLOCKED_OUT";

export type MealStatus = {
  phase: ClockPhase;
  showMealButtons: boolean;
  dailyHours: number;
  elapsedHours: number;
  hoursUntilMealAvailable: number | null;
  showReminder: boolean;
  shiftId: string | null;
};

function timeDiffHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em - (sh * 60 + sm)) / 60;
  if (diff <= 0) diff += 24;
  return diff;
}

export async function getTodayMealStatus(
  employeeId: string,
  weeklyHours: number
): Promise<MealStatus> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [shift, entries] = await Promise.all([
    prisma.shift.findFirst({
      where: { employeeId, date: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.timeClockEntry.findMany({
      where: { employeeId, timestamp: { gte: todayStart, lte: todayEnd } },
      orderBy: { timestamp: "asc" },
    }),
  ]);

  const dailyHours = shift ? timeDiffHours(shift.startTime, shift.endTime) : weeklyHours / 5;

  let lastClockIn: Date | null = null;
  let mealStarted = false;
  let mealEnded = false;
  let clockedIn = false;
  const hadAnyEntry = entries.length > 0;

  for (const e of entries) {
    if (e.type === "CLOCK_IN") {
      lastClockIn = e.timestamp;
      mealStarted = false;
      mealEnded = false;
      clockedIn = true;
    }
    if (e.type === "BREAK_START") mealStarted = true;
    if (e.type === "BREAK_END") mealEnded = true;
    if (e.type === "CLOCK_OUT") clockedIn = false;
  }

  const elapsedHours =
    clockedIn && lastClockIn ? (now.getTime() - lastClockIn.getTime()) / 3_600_000 : 0;

  const showMealButtons = dailyHours >= 5;
  const totalSpanHours = dailyHours + 1; // turno + 1h de refeição padrão
  const availableAtHour = Math.max(0, totalSpanHours - 6);

  let phase: ClockPhase;
  if (!clockedIn) {
    phase = hadAnyEntry ? "CLOCKED_OUT" : "NOT_CLOCKED_IN";
  } else if (mealStarted && !mealEnded) {
    phase = "ON_MEAL";
  } else if (mealEnded) {
    phase = "AFTER_MEAL";
  } else if (showMealButtons && elapsedHours >= availableAtHour) {
    phase = "MEAL_AVAILABLE";
  } else {
    phase = "WORKING";
  }

  const hoursUntilMealAvailable =
    phase === "WORKING" ? Math.max(0, availableAtHour - elapsedHours) : null;

  const dismissedToday =
    !!shift?.mealAlertDismissedAt && isoDate(shift.mealAlertDismissedAt) === isoDate(now);
  const overdue = clockedIn && !mealStarted && showMealButtons && elapsedHours > 5;
  const showReminder = overdue && !dismissedToday;

  if (overdue) {
    await flagMealOverdue(employeeId, shift?.id ?? null);
  }

  return {
    phase,
    showMealButtons,
    dailyHours,
    elapsedHours,
    hoursUntilMealAvailable,
    showReminder,
    shiftId: shift?.id ?? null,
  };
}

// Cria tarefas para o gestor de RH e o supervisor direto do colaborador,
// e regista o alerta no turno do dia — só uma vez por dia por colaborador.
async function flagMealOverdue(employeeId: string, shiftId: string | null) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const existing = await prisma.task.findFirst({
    where: {
      employeeId,
      type: "MEAL_BREAK_SCHEDULE",
      status: "OPEN",
      createdAt: { gte: todayStart },
    },
  });
  if (existing) {
    if (shiftId) {
      await prisma.shift.updateMany({
        where: { id: shiftId, mealAlertAt: null },
        data: { mealAlertAt: new Date() },
      });
    }
    return;
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { manager: { include: { user: true } } },
  });
  if (!employee) return;

  const assigneeIds = new Set<string>();

  const rhAdmins = await prisma.user.findMany({
    where: { active: true, roles: { some: { role: "ADMIN_RH" } } },
    select: { id: true },
  });
  rhAdmins.forEach((u) => assigneeIds.add(u.id));

  if (employee.departmentId) {
    const scheduleManagers = await prisma.user.findMany({
      where: {
        active: true,
        roles: { some: { role: "GESTOR_EQUIPA", departmentId: employee.departmentId } },
      },
      select: { id: true },
    });
    scheduleManagers.forEach((u) => assigneeIds.add(u.id));
  }

  if (employee.manager?.user) assigneeIds.add(employee.manager.user.id);

  if (assigneeIds.size === 0) return;

  const employeeName = `${employee.firstName} ${employee.lastName}`;
  const title = `Definir pausa de refeição — ${employeeName}`;
  const description = `${employeeName} já leva mais de 5 horas em turno sem ter iniciado a refeição. Reveja e ajuste o horário/escala.`;

  await prisma.task.createMany({
    data: Array.from(assigneeIds).map((assigneeId) => ({
      title,
      description,
      type: "MEAL_BREAK_SCHEDULE",
      assigneeId,
      employeeId,
    })),
  });

  if (shiftId) {
    await prisma.shift.update({ where: { id: shiftId }, data: { mealAlertAt: new Date() } });
  }

  await logAudit({
    action: "MEAL_ALERT",
    entity: "Shift",
    entityId: shiftId,
    details: employeeName,
  });
}
