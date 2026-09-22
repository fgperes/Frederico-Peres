import { prisma } from "@/lib/prisma";

export const HOLIDAY_SCOPES = ["NATIONAL", "REGIONAL"] as const;
export type HolidayScope = (typeof HOLIDAY_SCOPES)[number];

type SeedHoliday = { date: string; description: string };

// Feriados obrigatórios em Portugal (fixos + móveis, calculados a partir da
// Páscoa) para 2026 e 2027 — semeados automaticamente na primeira vez que
// a página de Feriados é aberta (mesmo padrão de auto-instalação usado em
// getContractTypes/ensureMatrixLoaded).
const PT_HOLIDAYS_2026: SeedHoliday[] = [
  { date: "2026-01-01", description: "Ano Novo" },
  { date: "2026-04-03", description: "Sexta-feira Santa" },
  { date: "2026-04-05", description: "Páscoa" },
  { date: "2026-04-25", description: "Dia da Liberdade" },
  { date: "2026-05-01", description: "Dia do Trabalhador" },
  { date: "2026-06-04", description: "Corpo de Deus" },
  { date: "2026-06-10", description: "Dia de Portugal" },
  { date: "2026-08-15", description: "Assunção de Nossa Senhora" },
  { date: "2026-10-05", description: "Implantação da República" },
  { date: "2026-11-01", description: "Todos os Santos" },
  { date: "2026-12-01", description: "Restauração da Independência" },
  { date: "2026-12-08", description: "Imaculada Conceição" },
  { date: "2026-12-25", description: "Natal" },
];

const PT_HOLIDAYS_2027: SeedHoliday[] = [
  { date: "2027-01-01", description: "Ano Novo" },
  { date: "2027-03-26", description: "Sexta-feira Santa" },
  { date: "2027-03-28", description: "Páscoa" },
  { date: "2027-04-25", description: "Dia da Liberdade" },
  { date: "2027-05-01", description: "Dia do Trabalhador" },
  { date: "2027-05-27", description: "Corpo de Deus" },
  { date: "2027-06-10", description: "Dia de Portugal" },
  { date: "2027-08-15", description: "Assunção de Nossa Senhora" },
  { date: "2027-10-05", description: "Implantação da República" },
  { date: "2027-11-01", description: "Todos os Santos" },
  { date: "2027-12-01", description: "Restauração da Independência" },
  { date: "2027-12-08", description: "Imaculada Conceição" },
  { date: "2027-12-25", description: "Natal" },
];

export async function ensureHolidaysSeeded(): Promise<void> {
  const count = await prisma.holiday.count();
  if (count > 0) return;

  const all = [...PT_HOLIDAYS_2026, ...PT_HOLIDAYS_2027];
  await prisma.holiday.createMany({
    data: all.map((h) => ({
      date: new Date(`${h.date}T00:00:00`),
      description: h.description,
      scope: "NATIONAL",
    })),
    skipDuplicates: true,
  });
}

export async function getHolidays() {
  await ensureHolidaysSeeded();
  return prisma.holiday.findMany({
    orderBy: { date: "asc" },
    include: { locations: true },
  });
}
