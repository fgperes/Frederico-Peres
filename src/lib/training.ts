import { prisma } from "@/lib/prisma";

// Formação — por lei, cada colaborador deve ter 40h de formação por ano.
// Essas horas vêm de duas fontes: formações internas/externas registadas
// neste módulo (Training, via TrainingEnrollment — soma das horas das
// sessões do cronograma), e ausências marcadas como "conta para horas de
// formação" (ver Absence.countsAsTraining/trainingHours, no módulo de
// Ausências). Sem estado próprio de aprovação: a formação conta a partir do
// momento em que o colaborador está inscrito.

export const ANNUAL_TRAINING_HOURS_TARGET = 40;

export type TrainingYearBalance = {
  year: number;
  hoursFromTrainings: number;
  hoursFromAbsences: number;
  totalHours: number;
  target: number;
  balance: number; // totalHours - target (negativo = por cumprir)
};

export type TrainingBalances = {
  years: TrainingYearBalance[]; // mais recente primeiro
  accumulatedHours: number;
  accumulatedTarget: number;
  accumulatedBalance: number;
};

export async function getEmployeeTrainingBalances(employeeId: string): Promise<TrainingBalances> {
  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: employeeId },
    select: { hireDate: true },
  });

  const [enrollments, trainingAbsences] = await Promise.all([
    prisma.trainingEnrollment.findMany({
      where: { employeeId },
      include: { training: { include: { sessions: true } } },
    }),
    prisma.absence.findMany({
      where: { employeeId, countsAsTraining: true, status: "APPROVED" },
      select: { startDate: true, trainingHours: true },
    }),
  ]);

  const hoursByYearFromTrainings = new Map<number, number>();
  for (const enrollment of enrollments) {
    for (const session of enrollment.training.sessions) {
      const year = session.date.getFullYear();
      hoursByYearFromTrainings.set(year, (hoursByYearFromTrainings.get(year) ?? 0) + session.hours);
    }
  }

  const hoursByYearFromAbsences = new Map<number, number>();
  for (const absence of trainingAbsences) {
    const year = absence.startDate.getFullYear();
    hoursByYearFromAbsences.set(year, (hoursByYearFromAbsences.get(year) ?? 0) + (absence.trainingHours ?? 0));
  }

  const currentYear = new Date().getFullYear();
  const candidateYears = [
    ...hoursByYearFromTrainings.keys(),
    ...hoursByYearFromAbsences.keys(),
    currentYear,
    ...(employee.hireDate ? [employee.hireDate.getFullYear()] : []),
  ];
  const firstYear = Math.min(...candidateYears);

  const years: TrainingYearBalance[] = [];
  for (let year = firstYear; year <= currentYear; year++) {
    const hoursFromTrainings = hoursByYearFromTrainings.get(year) ?? 0;
    const hoursFromAbsences = hoursByYearFromAbsences.get(year) ?? 0;
    const totalHours = hoursFromTrainings + hoursFromAbsences;
    years.push({
      year,
      hoursFromTrainings,
      hoursFromAbsences,
      totalHours,
      target: ANNUAL_TRAINING_HOURS_TARGET,
      balance: totalHours - ANNUAL_TRAINING_HOURS_TARGET,
    });
  }

  const accumulatedHours = years.reduce((sum, y) => sum + y.totalHours, 0);
  const accumulatedTarget = years.length * ANNUAL_TRAINING_HOURS_TARGET;

  return {
    years: years.reverse(),
    accumulatedHours,
    accumulatedTarget,
    accumulatedBalance: accumulatedHours - accumulatedTarget,
  };
}
