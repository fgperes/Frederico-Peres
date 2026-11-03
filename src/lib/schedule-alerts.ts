import { differenceInCalendarDays } from "date-fns";
import { isoDate, getWeekStart } from "./dates";
import { shiftDurationHours, minutesFromMidnight, shiftEndOffsetMinutes } from "./schedule";

// Regras de conformidade com o Código do Trabalho (CT) usadas tanto para
// destacar a grelha de Escalas (aviso visual) como, nos pontos de escrita
// manual de turnos (criar/editar/mover/copiar em escalas/actions.ts), para
// bloquear a gravação — ver validateShiftAgainstLabourLaw abaixo.
const MIN_REST_MINUTES = 11 * 60; // CT, art.º 214.º — descanso diário mínimo entre jornadas
const MAX_CONSECUTIVE_DAYS = 6; // CT, art.º 205.º/232.º — descanso semanal obrigatório
const MAX_DAILY_HOURS = 8; // CT, art.º 203.º — período normal de trabalho diário
const MAX_CONTINUOUS_WORK_MINUTES = 5 * 60; // CT, art.º 213.º — intervalo de descanso obrigatório acima de 5h seguidas

export type ScheduleAlertType =
  | "REST"
  | "OVERLAP"
  | "EXCESS_HOURS"
  | "DAILY_EXCESS_HOURS"
  | "CONSECUTIVE_DAYS"
  | "BREAK_MISSING";

export type ScheduleAlert = {
  type: ScheduleAlertType;
  employeeId: string;
  employeeName: string;
  message: string;
  dates: string[]; // datas ISO envolvidas, para destacar células na grelha
};

type AlertShift = {
  employeeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  shiftTemplate?: { breakMins: number } | null;
};
type AlertEmployee = { id: string; firstName: string; lastName: string };

export function findScheduleAlerts(
  shifts: AlertShift[],
  employees: AlertEmployee[],
  weeklyContractHoursByEmployee: Map<string, number>
): ScheduleAlert[] {
  const nameOf = (id: string) => {
    const e = employees.find((emp) => emp.id === id);
    return e ? `${e.firstName} ${e.lastName}` : "Colaborador";
  };

  const byEmployee = new Map<string, AlertShift[]>();
  for (const s of shifts) {
    const arr = byEmployee.get(s.employeeId) ?? [];
    arr.push(s);
    byEmployee.set(s.employeeId, arr);
  }

  const alerts: ScheduleAlert[] = [];

  for (const [employeeId, empShiftsRaw] of byEmployee) {
    const empShifts = [...empShiftsRaw].sort(
      (a, b) => a.date.getTime() - b.date.getTime() || minutesFromMidnight(a.startTime) - minutesFromMidnight(b.startTime)
    );
    const name = nameOf(employeeId);

    // Sobreposição: 2+ turnos no mesmo dia cujos intervalos se cruzam.
    const byDay = new Map<string, AlertShift[]>();
    for (const s of empShifts) {
      const key = isoDate(s.date);
      const arr = byDay.get(key) ?? [];
      arr.push(s);
      byDay.set(key, arr);
    }
    for (const [day, dayShifts] of byDay) {
      if (dayShifts.length < 2) continue;
      for (let i = 0; i < dayShifts.length; i++) {
        for (let j = i + 1; j < dayShifts.length; j++) {
          const a = dayShifts[i];
          const b = dayShifts[j];
          const aStart = minutesFromMidnight(a.startTime);
          const aEnd = shiftEndOffsetMinutes(a.startTime, a.endTime);
          const bStart = minutesFromMidnight(b.startTime);
          const bEnd = shiftEndOffsetMinutes(b.startTime, b.endTime);
          if (aStart < bEnd && bStart < aEnd) {
            alerts.push({
              type: "OVERLAP",
              employeeId,
              employeeName: name,
              message: `${name}: turnos sobrepostos em ${day} (${a.startTime}-${a.endTime} e ${b.startTime}-${b.endTime}).`,
              dates: [day],
            });
          }
        }
      }
    }

    // Descanso mínimo: menos de 11h entre o fim de um turno e o início do
    // turno do dia seguinte.
    for (let i = 1; i < empShifts.length; i++) {
      const prev = empShifts[i - 1];
      const next = empShifts[i];
      if (differenceInCalendarDays(next.date, prev.date) !== 1) continue;
      const prevEnd = shiftEndOffsetMinutes(prev.startTime, prev.endTime);
      const nextStart = 24 * 60 + minutesFromMidnight(next.startTime);
      if (nextStart - prevEnd < MIN_REST_MINUTES) {
        alerts.push({
          type: "REST",
          employeeId,
          employeeName: name,
          message: `${name}: menos de 11h de descanso entre ${isoDate(prev.date)} e ${isoDate(next.date)}.`,
          dates: [isoDate(prev.date), isoDate(next.date)],
        });
      }
    }

    // Dias de trabalho seguidos sem folga (> 6).
    const uniqueDays = [...new Set(empShifts.map((s) => isoDate(s.date)))].sort();
    let streakStart = 0;
    for (let i = 1; i <= uniqueDays.length; i++) {
      const brokeStreak =
        i === uniqueDays.length || differenceInCalendarDays(new Date(uniqueDays[i]), new Date(uniqueDays[i - 1])) !== 1;
      if (brokeStreak) {
        const streakLen = i - streakStart;
        if (streakLen > MAX_CONSECUTIVE_DAYS) {
          const streakDays = uniqueDays.slice(streakStart, i);
          alerts.push({
            type: "CONSECUTIVE_DAYS",
            employeeId,
            employeeName: name,
            message: `${name}: ${streakLen} dias de trabalho seguidos sem folga (${streakDays[0]} a ${streakDays[streakDays.length - 1]}).`,
            dates: streakDays,
          });
        }
        streakStart = i;
      }
    }

    // Excesso de horas: total agendado por semana (ISO) acima do contrato.
    const contractHours = weeklyContractHoursByEmployee.get(employeeId);
    if (contractHours) {
      const byWeek = new Map<string, number>();
      for (const s of empShifts) {
        const week = isoDate(getWeekStart(isoDate(s.date)));
        byWeek.set(
          week,
          (byWeek.get(week) ?? 0) + shiftDurationHours(s.startTime, s.endTime, s.shiftTemplate?.breakMins ?? 0)
        );
      }
      for (const [week, hours] of byWeek) {
        if (hours > contractHours) {
          alerts.push({
            type: "EXCESS_HOURS",
            employeeId,
            employeeName: name,
            message: `${name}: ${hours.toFixed(1)}h agendadas na semana de ${week}, acima das ${contractHours}h do contrato.`,
            dates: [],
          });
        }
      }
    }

    // Excesso de horas diário (CT, art.º 203.º): soma líquida (já descontada
    // a pausa) dos turnos de cada dia não pode exceder 8h — independente do
    // teto semanal do contrato, que por si só não impede um único dia longo
    // de mais de 8h desde que a semana feche nas horas certas.
    const byDayHours = new Map<string, number>();
    for (const s of empShifts) {
      const day = isoDate(s.date);
      byDayHours.set(
        day,
        (byDayHours.get(day) ?? 0) + shiftDurationHours(s.startTime, s.endTime, s.shiftTemplate?.breakMins ?? 0)
      );
    }
    for (const [day, hours] of byDayHours) {
      if (hours > MAX_DAILY_HOURS) {
        alerts.push({
          type: "DAILY_EXCESS_HOURS",
          employeeId,
          employeeName: name,
          message: `${name}: ${hours.toFixed(1)}h líquidas agendadas em ${day}, acima do período normal diário de ${MAX_DAILY_HOURS}h (CT, art.º 203.º).`,
          dates: [day],
        });
      }
    }

    // Pausa obrigatória (CT, art.º 213.º): turno com mais de 5h de trabalho
    // contínuo (amplitude bruta menos a pausa configurada) tem sempre de
    // incluir um intervalo de descanso — sem isso, o próprio tempo de
    // trabalho seguido já ultrapassa o limite que a pausa existe para evitar.
    for (const s of empShifts) {
      const rawMinutes = shiftEndOffsetMinutes(s.startTime, s.endTime) - minutesFromMidnight(s.startTime);
      const breakMins = s.shiftTemplate?.breakMins ?? 0;
      const continuousMinutes = breakMins > 0 ? Math.max(rawMinutes - breakMins, breakMins) : rawMinutes;
      if (continuousMinutes > MAX_CONTINUOUS_WORK_MINUTES && breakMins <= 0) {
        alerts.push({
          type: "BREAK_MISSING",
          employeeId,
          employeeName: name,
          message: `${name}: turno de ${s.startTime}-${s.endTime} em ${isoDate(s.date)} tem mais de 5h seguidas sem pausa configurada (CT, art.º 213.º — obrigatória acima de 5h de trabalho contínuo).`,
          dates: [isoDate(s.date)],
        });
      }
    }
  }

  return alerts;
}

type ShiftForValidation = {
  id?: string;
  employeeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  shiftTemplate?: { breakMins: number } | null;
};

// Valida um turno proposto (novo ou editado) contra o Código do Trabalho,
// considerando-o já inserido no conjunto de turnos existentes do
// colaborador — usado pelas ações de escrita manual (criar/editar/mover/
// copiar) para bloquear a gravação em caso de incumprimento, em vez de só
// avisar visualmente na grelha. Devolve a primeira mensagem de violação
// encontrada que envolva a data do turno proposto, ou null se estiver tudo
// conforme.
export function validateShiftAgainstLabourLaw(
  proposedShift: ShiftForValidation,
  existingShifts: ShiftForValidation[],
  employeeName: string,
  contractWeeklyHours: number | null
): string | null {
  const otherShifts = existingShifts.filter((s) => s.id === undefined || s.id !== proposedShift.id);
  const allShifts = [...otherShifts, proposedShift];
  const employees = [{ id: proposedShift.employeeId, firstName: employeeName, lastName: "" }];
  const contractMap = new Map<string, number>();
  if (contractWeeklyHours) contractMap.set(proposedShift.employeeId, contractWeeklyHours);

  const alerts = findScheduleAlerts(allShifts, employees, contractMap);
  const proposedDateIso = isoDate(proposedShift.date);
  const relevant = alerts.find((a) => a.dates.length === 0 || a.dates.includes(proposedDateIso));
  return relevant ? relevant.message.replace(`${employeeName} :`, `${employeeName}:`).trim() : null;
}
