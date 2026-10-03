import { differenceInCalendarDays } from "date-fns";
import { isoDate, getWeekStart } from "./dates";
import { shiftDurationHours, minutesFromMidnight, shiftEndOffsetMinutes } from "./schedule";

// Regras usadas só para destacar a grelha de Escalas na UI — não bloqueiam
// nada (a geração automática já respeita o descanso de 11h e o teto de
// 40h/semana nas suas próprias regras; isto é um aviso visual para quem
// edita turnos manualmente, incluindo depois de publicados).
const MIN_REST_MINUTES = 11 * 60; // Código do Trabalho, art.º 214.º
const MAX_CONSECUTIVE_DAYS = 6; // Código do Trabalho, art.º 205.º — descanso semanal obrigatório

export type ScheduleAlertType = "REST" | "OVERLAP" | "EXCESS_HOURS" | "CONSECUTIVE_DAYS";

export type ScheduleAlert = {
  type: ScheduleAlertType;
  employeeId: string;
  employeeName: string;
  message: string;
  dates: string[]; // datas ISO envolvidas, para destacar células na grelha
};

type AlertShift = { employeeId: string; date: Date; startTime: string; endTime: string };
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
        byWeek.set(week, (byWeek.get(week) ?? 0) + shiftDurationHours(s.startTime, s.endTime, 0));
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
  }

  return alerts;
}
