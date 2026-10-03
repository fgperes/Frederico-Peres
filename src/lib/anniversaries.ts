import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getModuleSubscription } from "@/lib/subscriptions";

export type AnniversaryKind = "BIRTHDAY" | "WORK_ANNIVERSARY";

export type TodayAnniversary = {
  employeeId: string;
  firstName: string;
  lastName: string;
  avatarKey: string | null;
  avatarImage: string | null;
  kind: AnniversaryKind;
  years?: number; // só para aniversário de entrada — nunca se mostra idade
};

// Aniversários (nascimento e entrada) de hoje — sempre à escala da empresa
// toda (colaboradores ativos), independentemente do âmbito de dados do
// utilizador: é uma funcionalidade social (parabéns entre colegas), não uma
// vista operacional, por isso não passa por employeeScopeWhere. O
// Administrador do Sistema pode desligar só a parte de aniversários de
// entrada (ModuleSubscription.workAnniversaryEnabled); os de nascimento
// ficam sempre ativos.
export async function getTodaysAnniversaries(): Promise<TodayAnniversary[]> {
  // Datas de nascimento/admissão são guardadas à meia-noite UTC (input
  // type="date" → new Date("YYYY-MM-DD") interpreta sempre em UTC) — usar
  // os getters UTC ao ler evita que um servidor noutro fuso horário "veja"
  // o dia anterior ou seguinte.
  const today = new Date();
  const month = today.getUTCMonth();
  const day = today.getUTCDate();
  const year = today.getUTCFullYear();

  const subscription = await getModuleSubscription();

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      hireDate: true,
      user: { select: { avatarKey: true, avatarImage: true } },
    },
  });

  const results: TodayAnniversary[] = [];
  for (const e of employees) {
    if (e.birthDate && e.birthDate.getUTCMonth() === month && e.birthDate.getUTCDate() === day) {
      results.push({
        employeeId: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        avatarKey: e.user?.avatarKey ?? null,
        avatarImage: e.user?.avatarImage ?? null,
        kind: "BIRTHDAY",
      });
    }
    if (
      subscription.workAnniversaryEnabled &&
      e.hireDate &&
      e.hireDate.getUTCMonth() === month &&
      e.hireDate.getUTCDate() === day &&
      e.hireDate.getUTCFullYear() < year
    ) {
      results.push({
        employeeId: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        avatarKey: e.user?.avatarKey ?? null,
        avatarImage: e.user?.avatarImage ?? null,
        kind: "WORK_ANNIVERSARY",
        years: year - e.hireDate.getUTCFullYear(),
      });
    }
  }
  return results;
}

// Para cada entrada de hoje (colaborador+tipo), diz se o utilizador atual já
// deixou mensagem este ano — usado só para desenhar o botão certo no
// widget (não expõe quem mais comentou nem o conteúdo).
export async function getMyAlreadyCommentedKeys(
  authorId: string,
  entries: { employeeId: string; kind: AnniversaryKind }[]
): Promise<string[]> {
  if (entries.length === 0) return [];
  const year = new Date().getFullYear();
  const employeeIds = [...new Set(entries.map((e) => e.employeeId))];
  const comments = await prisma.anniversaryComment.findMany({
    where: { authorId, year, employeeId: { in: employeeIds } },
    select: { employeeId: true, kind: true },
  });
  const commentedSet = new Set(comments.map((c) => `${c.employeeId}_${c.kind}`));
  return entries.map((e) => `${e.employeeId}_${e.kind}`).filter((k) => commentedSet.has(k));
}

export type UpcomingAbsence = {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: Date;
  endDate: Date;
  typeName: string;
  isVacation: boolean;
};

// Ausências/férias já aprovadas que ainda não começaram — "Ausentes hoje" é
// um widget à parte (quem já está fora agora); este é propositadamente só o
// que vem a seguir, dentro do âmbito de dados do utilizador (própria ficha /
// departamento / empresa toda, conforme employeeScopeWhere).
export async function getUpcomingAbsences(
  scope: Prisma.EmployeeWhereInput,
  limit = 8
): Promise<UpcomingAbsence[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const absences = await prisma.absence.findMany({
    where: { employee: scope, status: "APPROVED", startDate: { gt: today } },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      absenceType: { select: { name: true, isVacation: true } },
    },
    orderBy: { startDate: "asc" },
    take: limit,
  });

  return absences.map((a) => ({
    id: a.id,
    employeeId: a.employeeId,
    employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
    startDate: a.startDate,
    endDate: a.endDate,
    typeName: a.absenceType.name,
    isVacation: a.absenceType.isVacation,
  }));
}
