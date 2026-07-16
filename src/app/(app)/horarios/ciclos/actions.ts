"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { addDays, parseISO } from "date-fns";

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "horarios")) {
    throw new Error("Sem permissão para editar horários.");
  }
  return user;
}

export async function createCycle(formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const weeks = Number(formData.get("weeks") ?? 2);
  const startDate = String(formData.get("startDate") ?? "");
  const departmentId = String(formData.get("departmentId") ?? "") || null;

  if (!name || !startDate) throw new Error("Nome e data de início obrigatórios.");

  const cycle = await prisma.scheduleCycle.create({
    data: { name, weeks, startDate: parseISO(startDate), departmentId },
  });

  await logAudit({ userId: user.id, action: "CREATE", entity: "ScheduleCycle", entityId: cycle.id, details: name });
  revalidatePath("/horarios/ciclos");
}

export async function setPatternCell(formData: FormData) {
  const user = await assertCanWrite();
  const cycleId = String(formData.get("cycleId"));
  const weekIndex = Number(formData.get("weekIndex"));
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const shiftTemplateId = String(formData.get("shiftTemplateId") ?? "") || null;

  const existing = await prisma.scheduleCyclePattern.findFirst({
    where: { cycleId, weekIndex, dayOfWeek },
  });

  if (existing) {
    await prisma.scheduleCyclePattern.update({
      where: { id: existing.id },
      data: { shiftTemplateId, isDayOff: !shiftTemplateId },
    });
  } else {
    await prisma.scheduleCyclePattern.create({
      data: { cycleId, weekIndex, dayOfWeek, shiftTemplateId, isDayOff: !shiftTemplateId },
    });
  }

  await logAudit({ userId: user.id, action: "UPDATE", entity: "ScheduleCyclePattern", entityId: cycleId });
  revalidatePath(`/horarios/ciclos/${cycleId}`);
}

export async function assignEmployeeToCycle(formData: FormData) {
  const user = await assertCanWrite();
  const cycleId = String(formData.get("cycleId"));
  const employeeId = String(formData.get("employeeId"));
  const offsetWeeks = Number(formData.get("offsetWeeks") ?? 0);

  if (!employeeId) throw new Error("Selecione um colaborador.");

  await prisma.scheduleCycleAssignment.create({
    data: { cycleId, employeeId, offsetWeeks },
  });

  await logAudit({ userId: user.id, action: "CREATE", entity: "ScheduleCycleAssignment", entityId: cycleId });
  revalidatePath(`/horarios/ciclos/${cycleId}`);
}

export async function removeAssignment(assignmentId: string, cycleId: string) {
  const user = await assertCanWrite();
  await prisma.scheduleCycleAssignment.delete({ where: { id: assignmentId } });
  await logAudit({ userId: user.id, action: "DELETE", entity: "ScheduleCycleAssignment", entityId: assignmentId });
  revalidatePath(`/horarios/ciclos/${cycleId}`);
}

// HC-03: gera automaticamente as escalas futuras com base no ciclo definido,
// respeitando ausências já aprovadas (HC-05 sinaliza o conflito ao ignorar o dia).
export async function generateCycleSchedule(cycleId: string, horizonWeeks: number) {
  const user = await assertCanWrite();

  const cycle = await prisma.scheduleCycle.findUniqueOrThrow({
    where: { id: cycleId },
    include: { pattern: true, assignments: true },
  });

  let created = 0;
  let skippedDueToAbsence = 0;

  for (const assignment of cycle.assignments) {
    for (let w = 0; w < horizonWeeks; w++) {
      const cycleWeekIndex = (w + assignment.offsetWeeks) % cycle.weeks;
      const weekStart = addDays(cycle.startDate, w * 7);

      for (let dow = 0; dow < 7; dow++) {
        const patternCell = cycle.pattern.find(
          (p) => p.weekIndex === cycleWeekIndex && p.dayOfWeek === dow
        );
        if (!patternCell || patternCell.isDayOff || !patternCell.shiftTemplateId) continue;

        const date = addDays(weekStart, dow);

        const approvedAbsence = await prisma.absence.findFirst({
          where: {
            employeeId: assignment.employeeId,
            status: "APPROVED",
            startDate: { lte: date },
            endDate: { gte: date },
          },
        });
        if (approvedAbsence) {
          skippedDueToAbsence++;
          continue;
        }

        const exists = await prisma.shift.findFirst({
          where: { employeeId: assignment.employeeId, date },
        });
        if (exists) continue;

        const template = await prisma.shiftTemplate.findUnique({
          where: { id: patternCell.shiftTemplateId },
        });
        if (!template) continue;

        await prisma.shift.create({
          data: {
            employeeId: assignment.employeeId,
            date,
            startTime: template.startTime,
            endTime: template.endTime,
            shiftTemplateId: template.id,
            source: "CYCLE",
            status: "DRAFT",
          },
        });
        created++;
      }
    }
  }

  await logAudit({
    userId: user.id,
    action: "GENERATE",
    entity: "ScheduleCycle",
    entityId: cycleId,
    details: `${created} turnos gerados, ${skippedDueToAbsence} ignorados por ausência aprovada`,
  });

  revalidatePath("/horarios");
  revalidatePath(`/horarios/ciclos/${cycleId}`);

  return { created, skippedDueToAbsence };
}

export type GenerateState = {
  result?: { created: number; skippedDueToAbsence: number };
  error?: string;
};

export async function generateCycleScheduleAction(
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const cycleId = String(formData.get("cycleId"));
  const horizonWeeks = Number(formData.get("horizonWeeks") ?? 4);
  try {
    const result = await generateCycleSchedule(cycleId, horizonWeeks);
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao gerar escalas." };
  }
}
