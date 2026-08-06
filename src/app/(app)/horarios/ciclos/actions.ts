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

function shiftDurationHours(startTime: string, endTime: string, breakMins: number): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0) minutes += 24 * 60; // turno passa a meia-noite
  return Math.max(0, (minutes - breakMins) / 60);
}

// Média de horas semanais implícita no padrão do ciclo (soma de todas as
// células com turno, dividida pelo número de semanas do ciclo).
async function cycleWeeklyHours(cycleId: string, weeks: number): Promise<number> {
  const pattern = await prisma.scheduleCyclePattern.findMany({ where: { cycleId } });
  const templateIds = [...new Set(pattern.map((p) => p.shiftTemplateId).filter((id): id is string => !!id))];
  const templates = await prisma.shiftTemplate.findMany({ where: { id: { in: templateIds } } });
  const templateMap = new Map(templates.map((t) => [t.id, t]));

  let totalHours = 0;
  for (const cell of pattern) {
    if (cell.isDayOff || !cell.shiftTemplateId) continue;
    const t = templateMap.get(cell.shiftTemplateId);
    if (!t) continue;
    totalHours += shiftDurationHours(t.startTime, t.endTime, t.breakMins);
  }
  return weeks > 0 ? totalHours / weeks : 0;
}

export async function createCycle(formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const weeks = Number(formData.get("weeks") ?? 2);
  const startDate = String(formData.get("startDate") ?? "");

  if (!name || !startDate) throw new Error("Nome e data de início obrigatórios.");

  const cycle = await prisma.scheduleCycle.create({
    data: { name, weeks, startDate: parseISO(startDate) },
  });

  await logAudit({ userId: user.id, action: "CREATE", entity: "ScheduleCycle", entityId: cycle.id, details: name });
  revalidatePath("/horarios/ciclos");
}

export type CreateCycleState = { error?: string };

// Wrapper para useActionState — o formulário "Novo Ciclo" precisa de
// mostrar o erro (ex.: permissões, dados em falta) em vez de falhar em
// silêncio, que é o que acontecia com o form ligado diretamente a
// createCycle (uma exceção não tratada não dá qualquer feedback visível).
export async function createCycleAction(
  _prev: CreateCycleState,
  formData: FormData
): Promise<CreateCycleState> {
  try {
    await createCycle(formData);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar o ciclo." };
  }
}

// Adiciona uma semana em branco ao fim do ciclo.
export async function addWeek(cycleId: string) {
  const user = await assertCanWrite();
  const cycle = await prisma.scheduleCycle.update({
    where: { id: cycleId },
    data: { weeks: { increment: 1 } },
  });
  await logAudit({ userId: user.id, action: "ADD_WEEK", entity: "ScheduleCycle", entityId: cycleId });
  revalidatePath(`/horarios/ciclos/${cycleId}`);
  return cycle.weeks;
}

// Duplica uma semana existente para uma nova semana no fim do ciclo.
export async function duplicateWeek(cycleId: string, sourceWeekIndex: number) {
  const user = await assertCanWrite();
  const cycle = await prisma.scheduleCycle.findUniqueOrThrow({
    where: { id: cycleId },
    include: { pattern: true },
  });
  const newWeekIndex = cycle.weeks;
  const sourceCells = cycle.pattern.filter((p) => p.weekIndex === sourceWeekIndex);

  await prisma.$transaction([
    prisma.scheduleCycle.update({ where: { id: cycleId }, data: { weeks: { increment: 1 } } }),
    ...sourceCells.map((cell) =>
      prisma.scheduleCyclePattern.create({
        data: {
          cycleId,
          weekIndex: newWeekIndex,
          dayOfWeek: cell.dayOfWeek,
          shiftTemplateId: cell.shiftTemplateId,
          isDayOff: cell.isDayOff,
        },
      })
    ),
  ]);

  await logAudit({ userId: user.id, action: "DUPLICATE_WEEK", entity: "ScheduleCycle", entityId: cycleId });
  revalidatePath(`/horarios/ciclos/${cycleId}`);
}

// Remove a última semana do ciclo (apaga o respetivo padrão).
export async function removeWeek(cycleId: string, weekIndex: number) {
  const user = await assertCanWrite();
  const cycle = await prisma.scheduleCycle.findUniqueOrThrow({ where: { id: cycleId } });
  if (cycle.weeks <= 1) throw new Error("O ciclo tem de ter pelo menos uma semana.");

  await prisma.$transaction(async (tx) => {
    await tx.scheduleCyclePattern.deleteMany({ where: { cycleId, weekIndex } });
    // Reindexa as semanas seguintes para preencher o espaço.
    const remaining = await tx.scheduleCyclePattern.findMany({
      where: { cycleId, weekIndex: { gt: weekIndex } },
    });
    for (const cell of remaining) {
      await tx.scheduleCyclePattern.update({
        where: { id: cell.id },
        data: { weekIndex: cell.weekIndex - 1 },
      });
    }
    await tx.scheduleCycle.update({ where: { id: cycleId }, data: { weeks: { decrement: 1 } } });
  });

  await logAudit({ userId: user.id, action: "REMOVE_WEEK", entity: "ScheduleCycle", entityId: cycleId });
  revalidatePath(`/horarios/ciclos/${cycleId}`);
}

// Reordena as semanas do ciclo (drag-and-drop). `order` é a lista dos
// índices atuais na nova ordem pretendida, ex.: [2,0,1].
export async function reorderWeeks(cycleId: string, order: number[]) {
  const user = await assertCanWrite();
  const cycle = await prisma.scheduleCycle.findUniqueOrThrow({
    where: { id: cycleId },
    include: { pattern: true },
  });
  if (order.length !== cycle.weeks) throw new Error("Ordem de semanas inválida.");

  // Usa índices temporários (offset) para evitar colisões durante a escrita.
  const OFFSET = 1000;
  await prisma.$transaction([
    ...cycle.pattern.map((cell) =>
      prisma.scheduleCyclePattern.update({
        where: { id: cell.id },
        data: { weekIndex: cell.weekIndex + OFFSET },
      })
    ),
  ]);

  const updates = [];
  for (let newIndex = 0; newIndex < order.length; newIndex++) {
    const oldIndex = order[newIndex];
    updates.push(
      prisma.scheduleCyclePattern.updateMany({
        where: { cycleId, weekIndex: oldIndex + OFFSET },
        data: { weekIndex: newIndex },
      })
    );
  }
  await prisma.$transaction(updates);

  await logAudit({ userId: user.id, action: "REORDER_WEEKS", entity: "ScheduleCycle", entityId: cycleId });
  revalidatePath(`/horarios/ciclos/${cycleId}`);
}

// Guarda o ciclo atual como modelo reutilizável (só o padrão, sem
// colaboradores associados nem data de início específica).
export async function saveAsTemplate(cycleId: string, formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("templateName") ?? "").trim();
  if (!name) throw new Error("Indique um nome para o modelo.");

  const cycle = await prisma.scheduleCycle.findUniqueOrThrow({
    where: { id: cycleId },
    include: { pattern: true },
  });

  const template = await prisma.scheduleCycle.create({
    data: {
      name,
      weeks: cycle.weeks,
      startDate: new Date(),
      isTemplate: true,
      pattern: {
        create: cycle.pattern.map((p) => ({
          weekIndex: p.weekIndex,
          dayOfWeek: p.dayOfWeek,
          shiftTemplateId: p.shiftTemplateId,
          isDayOff: p.isDayOff,
        })),
      },
    },
  });

  await logAudit({ userId: user.id, action: "SAVE_TEMPLATE", entity: "ScheduleCycle", entityId: template.id, details: name });
  revalidatePath("/horarios/ciclos");
  revalidatePath(`/horarios/ciclos/${cycleId}`);
}

// Cria um novo ciclo "ao vivo" a partir de um modelo pré-definido.
export async function createCycleFromTemplate(formData: FormData) {
  const user = await assertCanWrite();
  const templateId = String(formData.get("templateId"));
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");

  if (!name || !startDate) throw new Error("Nome e data de início obrigatórios.");

  const template = await prisma.scheduleCycle.findUniqueOrThrow({
    where: { id: templateId },
    include: { pattern: true },
  });

  const cycle = await prisma.scheduleCycle.create({
    data: {
      name,
      weeks: template.weeks,
      startDate: parseISO(startDate),
      isTemplate: false,
      pattern: {
        create: template.pattern.map((p) => ({
          weekIndex: p.weekIndex,
          dayOfWeek: p.dayOfWeek,
          shiftTemplateId: p.shiftTemplateId,
          isDayOff: p.isDayOff,
        })),
      },
    },
  });

  await logAudit({ userId: user.id, action: "CREATE_FROM_TEMPLATE", entity: "ScheduleCycle", entityId: cycle.id, details: name });
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

// Associa vários colaboradores de uma vez ao ciclo, todos a começar na
// mesma semana do ciclo (offsetWeeks). Valida que a carga semanal
// contratada de cada colaborador corresponde à média semanal do padrão
// do ciclo — se não corresponder, rejeita o pedido todo com uma mensagem
// que identifica quem está em desacordo, para o gestor poder corrigir a
// seleção (ex.: remover esse colaborador ou escolher outro ciclo).
export async function assignEmployeesToCycle(
  cycleId: string,
  employeeIds: string[],
  offsetWeeks: number
) {
  const user = await assertCanWrite();
  if (employeeIds.length === 0) throw new Error("Selecione pelo menos um colaborador.");

  const cycle = await prisma.scheduleCycle.findUniqueOrThrow({ where: { id: cycleId } });
  if (offsetWeeks < 0 || offsetWeeks >= cycle.weeks) {
    throw new Error("Semana de início do ciclo inválida.");
  }

  const employees = await prisma.employee.findMany({ where: { id: { in: employeeIds } } });
  const avgWeeklyHours = await cycleWeeklyHours(cycleId, cycle.weeks);

  const mismatched = employees.filter((e) => Math.abs(e.weeklyHours - avgWeeklyHours) > 0.01);
  if (mismatched.length > 0) {
    const names = mismatched
      .map((e) => `${e.firstName} ${e.lastName} (${e.weeklyHours}h/semana)`)
      .join(", ");
    throw new Error(
      `A carga semanal não corresponde à do ciclo (${avgWeeklyHours.toFixed(1)}h/semana em média): ${names}.`
    );
  }

  const existing = await prisma.scheduleCycleAssignment.findMany({
    where: { cycleId, employeeId: { in: employeeIds } },
  });
  const alreadyAssigned = new Set(existing.map((a) => a.employeeId));
  const toAssign = employees.filter((e) => !alreadyAssigned.has(e.id));

  if (toAssign.length === 0) {
    throw new Error("Os colaboradores selecionados já estão associados a este ciclo.");
  }

  const created = await prisma.$transaction(
    toAssign.map((e) =>
      prisma.scheduleCycleAssignment.create({ data: { cycleId, employeeId: e.id, offsetWeeks } })
    )
  );

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "ScheduleCycleAssignment",
    entityId: cycleId,
    details: `${created.length} colaborador(es), semana +${offsetWeeks}`,
  });
  revalidatePath(`/horarios/ciclos/${cycleId}`);

  return created.map((a) => {
    const e = toAssign.find((emp) => emp.id === a.employeeId)!;
    return {
      id: a.id,
      employeeId: a.employeeId,
      offsetWeeks: a.offsetWeeks,
      firstName: e.firstName,
      lastName: e.lastName,
    };
  });
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
