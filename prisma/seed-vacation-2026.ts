import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Dados de teste: marca 22 dias de férias aprovados em 2026 para todos os
// colaboradores ativos (para testar o calendário de Férias por Equipa com
// dados preenchidos ao longo do ano, incluindo sobreposições) e garante que
// o contingente de férias de 2026 fica em 22 dias para todos. Idempotente —
// não duplica dias já marcados e recalcula sempre o total gasto a partir
// das ausências existentes.

const YEAR = 2026;
const TARGET_DAYS = 22;

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function businessDays(startDate: Date, count: number): Date[] {
  const days: Date[] = [];
  const cur = new Date(startDate);
  while (days.length < count) {
    if (isWeekday(cur)) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// Gerador pseudo-aleatório determinístico (mulberry32), semeado por
// colaborador — para o script ser idempotente (correr outra vez dá sempre
// os mesmos períodos, em vez de acumular dias novos a cada execução).
function hashToSeed(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Para cada colaborador, gera entre 2 e 4 períodos de férias aleatórios
// (datas e durações variáveis), cada um num segmento diferente do ano — para
// não se sobreporem entre si — cuja soma dá sempre exatamente 22 dias úteis.
function vacationDatesFor(rng: () => number): Date[] {
  const periodCount = 2 + Math.floor(rng() * 3); // 2, 3 ou 4 períodos
  const lengths: number[] = [];
  let remaining = TARGET_DAYS;
  for (let i = 0; i < periodCount - 1; i++) {
    const periodsLeftAfterThis = periodCount - i - 1;
    const maxLen = Math.min(10, remaining - periodsLeftAfterThis);
    const len = 1 + Math.floor(rng() * Math.max(1, maxLen));
    lengths.push(len);
    remaining -= len;
  }
  lengths.push(remaining);

  const segmentMonths = 12 / periodCount;
  const dates: Date[] = [];
  for (let i = 0; i < periodCount; i++) {
    const segmentStartMonth = Math.floor(i * segmentMonths);
    const segmentEndMonth = Math.floor((i + 1) * segmentMonths) - 1;
    const month = segmentStartMonth + Math.floor(rng() * Math.max(1, segmentEndMonth - segmentStartMonth + 1));
    const day = 1 + Math.floor(rng() * 15); // 1..15 — margem para o período não ultrapassar o ano
    dates.push(...businessDays(new Date(YEAR, month, day), lengths[i]));
  }
  return dates.filter((d) => d.getFullYear() === YEAR);
}

async function main() {
  const vacationType = await prisma.absenceType.findFirst({ where: { isVacation: true } });
  if (!vacationType) {
    throw new Error('Tipo de ausência "Férias" não encontrado — corra o seed principal primeiro.');
  }

  const admin =
    (await prisma.user.findFirst({ where: { roles: { some: { role: "ADMIN_SISTEMA" } } } })) ??
    (await prisma.user.findFirst());
  if (!admin) throw new Error("Nenhum utilizador encontrado para atribuir como requerente/aprovador.");

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  console.log(`Marcando férias de teste em ${YEAR} para ${employees.length} colaborador(es)...`);

  const yearStart = new Date(YEAR, 0, 1);
  const yearEnd = new Date(YEAR, 11, 31, 23, 59, 59);

  let totalCreated = 0;

  for (let i = 0; i < employees.length; i++) {
    const employee = employees[i];

    // Contingente (entitledDays) de 2026 fixado em 22 dias para todos.
    await prisma.absenceBalance.upsert({
      where: {
        employeeId_absenceTypeId_year: {
          employeeId: employee.id,
          absenceTypeId: vacationType.id,
          year: YEAR,
        },
      },
      create: {
        employeeId: employee.id,
        absenceTypeId: vacationType.id,
        year: YEAR,
        entitledDays: TARGET_DAYS,
      },
      update: { entitledDays: TARGET_DAYS },
    });

    const rng = mulberry32(hashToSeed(employee.id));
    const dates = vacationDatesFor(rng);
    for (const date of dates) {
      const existing = await prisma.absence.findFirst({
        where: {
          employeeId: employee.id,
          absenceTypeId: vacationType.id,
          startDate: date,
          endDate: date,
        },
      });
      if (existing) continue;

      await prisma.absence.create({
        data: {
          employeeId: employee.id,
          absenceTypeId: vacationType.id,
          startDate: date,
          endDate: date,
          days: 1,
          status: "APPROVED",
          requestedById: admin.id,
          approvedById: admin.id,
          decidedAt: new Date(),
        },
      });
      totalCreated++;
    }

    const usedDays = await prisma.absence.count({
      where: {
        employeeId: employee.id,
        absenceTypeId: vacationType.id,
        status: "APPROVED",
        startDate: { gte: yearStart, lte: yearEnd },
      },
    });
    await prisma.absenceBalance.update({
      where: {
        employeeId_absenceTypeId_year: {
          employeeId: employee.id,
          absenceTypeId: vacationType.id,
          year: YEAR,
        },
      },
      data: { usedDays },
    });

    console.log(`  ${employee.firstName} ${employee.lastName}: ${usedDays} dia(s) de férias em ${YEAR}`);
  }

  console.log(`\nConcluído: ${totalCreated} novo(s) dia(s) de férias criado(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
