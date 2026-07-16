"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { parseExcelFile } from "@/lib/excel";
import { getWeekStart, getWeekDays, isoDate } from "@/lib/dates";
import { z } from "zod";

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "horarios")) {
    throw new Error("Sem permissão para editar horários.");
  }
  return user;
}

export type ImportDemandState = {
  error?: string;
  result?: { total: number; created: number; errorReport: string[] };
};

const demandRowSchema = z.object({
  date: z.string().min(1),
  hour: z.coerce.number().min(0).max(23),
  department: z.string().optional(),
  location: z.string().optional(),
  demandValue: z.coerce.number().min(0),
});

// HP-01 / CD-01 / CD-03: carregamento de dados históricos e de procura via Excel.
export async function importDemandAction(
  _prev: ImportDemandState,
  formData: FormData
): Promise<ImportDemandState> {
  const user = await assertCanWrite();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Selecione um ficheiro Excel." };

  let rows: Record<string, unknown>[];
  try {
    rows = await parseExcelFile(file);
  } catch {
    return { error: "Não foi possível ler o ficheiro. Confirme que é um Excel válido (.xlsx)." };
  }
  if (rows.length === 0) return { error: "O ficheiro não contém linhas de dados." };

  const [departments, locations] = await Promise.all([
    prisma.department.findMany(),
    prisma.location.findMany(),
  ]);
  const deptByName = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));
  const locByName = new Map(locations.map((l) => [l.name.toLowerCase(), l.id]));

  const importLog = await prisma.importLog.create({
    data: { userId: user.id, type: "DEMAND", fileName: file.name, status: "PARTIAL", totalRows: rows.length },
  });

  const errorReport: string[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const parsed = demandRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errorReport.push(`Linha ${rowNum}: ${parsed.error.issues.map((iss) => iss.message).join("; ")}`);
      continue;
    }
    const data = parsed.data;
    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      errorReport.push(`Linha ${rowNum}: data inválida (${data.date}).`);
      continue;
    }

    await prisma.demandForecast.create({
      data: {
        date,
        hour: data.hour,
        demandValue: data.demandValue,
        departmentId: data.department ? deptByName.get(data.department.toLowerCase()) : undefined,
        locationId: data.location ? locByName.get(data.location.toLowerCase()) : undefined,
        source: "EXCEL",
        importLogId: importLog.id,
      },
    });
    created++;
  }

  await prisma.importLog.update({
    where: { id: importLog.id },
    data: {
      status: errorReport.length === 0 ? "SUCCESS" : created === 0 ? "ERROR" : "PARTIAL",
      errorRows: errorReport.length,
      errorReport: errorReport.length > 0 ? errorReport.join("\n") : null,
    },
  });

  await logAudit({
    userId: user.id,
    action: "IMPORT",
    entity: "DemandForecast",
    entityId: importLog.id,
    details: `${created}/${rows.length} registos de procura importados de ${file.name}`,
  });

  revalidatePath("/horarios/preditivo");
  return { result: { total: rows.length, created, errorReport } };
}

export async function revertDemandImport(importLogId: string) {
  const user = await assertCanWrite();
  const result = await prisma.demandForecast.deleteMany({ where: { importLogId } });
  await prisma.importLog.update({ where: { id: importLogId }, data: { status: "REVERTED" } });
  await logAudit({
    userId: user.id,
    action: "REVERT_IMPORT",
    entity: "DemandForecast",
    entityId: importLogId,
    details: `${result.count} registos removidos`,
  });
  revalidatePath("/horarios/preditivo");
}

type Window = { label: string; startHour: number; endHour: number };
const WINDOWS: Window[] = [
  { label: "Manhã", startHour: 6, endHour: 14 },
  { label: "Tarde", startHour: 14, endHour: 22 },
  { label: "Noite", startHour: 22, endHour: 30 }, // 22h-06h (30 = 6+24)
];

export type PredictiveState = {
  error?: string;
  result?: {
    createdShifts: number;
    windows: { day: string; window: string; required: number; assigned: number }[];
  };
};

// HP-03/HP-04/HP-08: gera uma proposta de horário com base em médias móveis
// da procura histórica, respeitando disponibilidade e ausências aprovadas.
export async function generatePredictiveProposalAction(
  _prev: PredictiveState,
  formData: FormData
): Promise<PredictiveState> {
  const user = await assertCanWrite();

  const weekIso = String(formData.get("week"));
  const departmentId = String(formData.get("departmentId") ?? "") || undefined;
  const capacityPerEmployee = Number(formData.get("capacityPerEmployee") ?? 10) || 10;
  const lookbackWeeks = 8;

  const weekStart = getWeekStart(weekIso);
  const days = getWeekDays(weekStart);

  const templates = await prisma.shiftTemplate.findMany();
  const templateForWindow = (win: Window) =>
    templates.find((t) => {
      const h = Number(t.startTime.split(":")[0]);
      const normalizedHour = h < win.startHour && win.endHour > 24 ? h + 24 : h;
      return normalizedHour >= win.startHour && normalizedHour < win.endHour;
    }) ?? templates[0];

  const employees = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      ...(departmentId ? { departmentId } : {}),
    },
  });

  const lookbackStart = new Date(weekStart);
  lookbackStart.setDate(lookbackStart.getDate() - lookbackWeeks * 7);

  const history = await prisma.demandForecast.findMany({
    where: {
      date: { gte: lookbackStart, lt: weekStart },
      ...(departmentId ? { departmentId } : {}),
    },
  });

  const weeklyAssignedHours = new Map<string, number>();
  let createdShifts = 0;
  const summary: { day: string; window: string; required: number; assigned: number }[] = [];

  for (const day of days) {
    const dow = day.getDay(); // 0=Domingo..6=Sábado

    const approvedAbsencesToday = await prisma.absence.findMany({
      where: { status: "APPROVED", startDate: { lte: day }, endDate: { gte: day } },
    });
    const absentEmployeeIds = new Set(approvedAbsencesToday.map((a) => a.employeeId));

    const existingShiftsToday = await prisma.shift.findMany({ where: { date: day } });
    const employeesWithShiftToday = new Set(existingShiftsToday.map((s) => s.employeeId));

    for (const win of WINDOWS) {
      const template = templateForWindow(win);
      if (!template) continue;

      const sameWeekdayHistory = history.filter((h) => h.date.getDay() === dow);
      const relevantHours = sameWeekdayHistory.filter((h) => {
        const hour = h.hour < win.startHour && win.endHour > 24 ? h.hour + 24 : h.hour;
        return hour >= win.startHour && hour < win.endHour;
      });
      const avgDemand =
        relevantHours.length > 0
          ? relevantHours.reduce((sum, h) => sum + h.demandValue, 0) / relevantHours.length
          : 0;

      const required = avgDemand > 0 ? Math.max(1, Math.ceil(avgDemand / capacityPerEmployee)) : 0;

      const candidates = employees
        .filter((e) => !absentEmployeeIds.has(e.id) && !employeesWithShiftToday.has(e.id))
        .sort(
          (a, b) =>
            (weeklyAssignedHours.get(a.id) ?? 0) - (weeklyAssignedHours.get(b.id) ?? 0)
        );

      let assigned = 0;
      for (const emp of candidates) {
        if (assigned >= required) break;
        const currentHours = weeklyAssignedHours.get(emp.id) ?? 0;
        if (currentHours + 8 > emp.weeklyHours) continue;

        await prisma.shift.create({
          data: {
            employeeId: emp.id,
            date: day,
            startTime: template.startTime,
            endTime: template.endTime,
            shiftTemplateId: template.id,
            source: "PREDICTIVE",
            status: "DRAFT",
            notes: `Proposta preditiva — procura média ${avgDemand.toFixed(1)}`,
          },
        });
        weeklyAssignedHours.set(emp.id, currentHours + 8);
        employeesWithShiftToday.add(emp.id);
        createdShifts++;
        assigned++;
      }

      if (required > 0) {
        summary.push({
          day: isoDate(day),
          window: win.label,
          required,
          assigned,
        });
      }
    }
  }

  await logAudit({
    userId: user.id,
    action: "GENERATE",
    entity: "Shift",
    details: `Proposta preditiva para semana de ${isoDate(weekStart)}: ${createdShifts} turnos`,
  });

  revalidatePath("/horarios");
  revalidatePath("/horarios/preditivo");

  return { result: { createdShifts, windows: summary } };
}
