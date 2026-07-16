"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getWeekStart, getWeekDays, isoDate, addWeeksIso } from "@/lib/dates";

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "horarios")) {
    throw new Error("Sem permissão para editar horários.");
  }
  return user;
}

export async function assignShift(formData: FormData) {
  const user = await assertCanWrite();
  const employeeId = String(formData.get("employeeId"));
  const date = String(formData.get("date"));
  const shiftTemplateId = String(formData.get("shiftTemplateId") ?? "") || null;
  const existingShiftId = String(formData.get("shiftId") ?? "") || null;

  if (!shiftTemplateId) {
    if (existingShiftId) {
      await prisma.shift.delete({ where: { id: existingShiftId } });
      await logAudit({ userId: user.id, action: "DELETE", entity: "Shift", entityId: existingShiftId });
    }
    revalidatePath("/horarios");
    return;
  }

  const template = await prisma.shiftTemplate.findUniqueOrThrow({
    where: { id: shiftTemplateId },
  });

  // HM-03: impedir atribuição em dia de ausência aprovada
  const dayStart = new Date(date + "T00:00:00");
  const dayEnd = new Date(date + "T23:59:59");
  const approvedAbsence = await prisma.absence.findFirst({
    where: {
      employeeId,
      status: "APPROVED",
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
    },
  });
  if (approvedAbsence) {
    // HM-03: impedir atribuição de turno em dia de ausência aprovada.
    return;
  }

  if (existingShiftId) {
    const shift = await prisma.shift.update({
      where: { id: existingShiftId },
      data: {
        shiftTemplateId,
        startTime: template.startTime,
        endTime: template.endTime,
        source: "MANUAL",
      },
    });
    await logAudit({ userId: user.id, action: "UPDATE", entity: "Shift", entityId: shift.id });
  } else {
    const shift = await prisma.shift.create({
      data: {
        employeeId,
        date: dayStart,
        startTime: template.startTime,
        endTime: template.endTime,
        shiftTemplateId,
        source: "MANUAL",
        status: "DRAFT",
      },
    });
    await logAudit({ userId: user.id, action: "CREATE", entity: "Shift", entityId: shift.id });
  }

  revalidatePath("/horarios");
}

export async function publishWeek(weekStartIso: string, departmentId?: string) {
  const user = await assertCanWrite();
  const weekStart = getWeekStart(weekStartIso);
  const days = getWeekDays(weekStart);

  const where = departmentId
    ? { date: { in: days }, employee: { departmentId } }
    : { date: { in: days } };

  const result = await prisma.shift.updateMany({
    where,
    data: { status: "PUBLISHED" },
  });

  await logAudit({
    userId: user.id,
    action: "PUBLISH",
    entity: "Shift",
    details: `Semana de ${isoDate(weekStart)} — ${result.count} turnos publicados`,
  });

  revalidatePath("/horarios");
}

export async function duplicateWeek(fromWeekIso: string, toWeekIso: string) {
  const user = await assertCanWrite();
  const fromStart = getWeekStart(fromWeekIso);
  const toStart = getWeekStart(toWeekIso);
  const fromDays = getWeekDays(fromStart);

  const sourceShifts = await prisma.shift.findMany({
    where: { date: { in: fromDays } },
  });

  const offsetDays = Math.round(
    (toStart.getTime() - fromStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  for (const s of sourceShifts) {
    const newDate = new Date(s.date);
    newDate.setDate(newDate.getDate() + offsetDays);

    const exists = await prisma.shift.findFirst({
      where: { employeeId: s.employeeId, date: newDate },
    });
    if (exists) continue;

    await prisma.shift.create({
      data: {
        employeeId: s.employeeId,
        date: newDate,
        startTime: s.startTime,
        endTime: s.endTime,
        shiftTemplateId: s.shiftTemplateId,
        source: "MANUAL",
        status: "DRAFT",
        notes: "Duplicado de semana anterior",
      },
    });
  }

  await logAudit({
    userId: user.id,
    action: "DUPLICATE",
    entity: "Shift",
    details: `De ${isoDate(fromStart)} para ${isoDate(toStart)}`,
  });

  revalidatePath("/horarios");
}

export async function createShiftTemplate(formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const breakMins = Number(formData.get("breakMins") ?? 0);
  const color = String(formData.get("color") ?? "#2563eb");

  if (!name || !startTime || !endTime) throw new Error("Campos obrigatórios em falta.");

  const template = await prisma.shiftTemplate.create({
    data: { name, startTime, endTime, breakMins, color },
  });

  await logAudit({ userId: user.id, action: "CREATE", entity: "ShiftTemplate", entityId: template.id, details: name });
  revalidatePath("/horarios/modelos");
}

export { addWeeksIso };
