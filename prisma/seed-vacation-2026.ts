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

// Para cada colaborador, gera 22 dias úteis distribuídos em dois blocos
// (verão e novembro, desfasados por colaborador para criar sobreposições
// parciais mas não totais) mais 2 dias soltos — em vez de 22 dias seguidos,
// o que testa melhor várias vistas mensais do calendário.
function vacationDatesFor(index: number): Date[] {
  const summerStart = new Date(YEAR, 5, 1 + (index % 6) * 7); // Junho, desfasado até 5 semanas
  const novemberStart = new Date(YEAR, 10, 1 + (index % 4) * 7); // Novembro, desfasado até 3 semanas
  const loneDay1 = businessDays(new Date(YEAR, 2, 2 + (index % 10)), 1)[0]; // Março
  const loneDay2 = businessDays(new Date(YEAR, 8, 2 + (index % 10)), 1)[0]; // Setembro

  return [
    ...businessDays(summerStart, 10),
    ...businessDays(novemberStart, 10),
    loneDay1,
    loneDay2,
  ];
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

    const dates = vacationDatesFor(i);
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
