import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { countDays } from "../src/lib/business-days";

const prisma = new PrismaClient();

// Dados de demonstração: 50 utilizadores variados (perfis, departamentos,
// tipos de contrato, ausências). Idempotente — pode ser corrido várias
// vezes sem duplicar quem já existe (verifica por email).

const DEMO_PASSWORD = "Demo@2026!";

const FIRST_NAMES = [
  "Ana", "Beatriz", "Carla", "Catarina", "Diana", "Elisabete", "Filipa",
  "Gabriela", "Helena", "Inês", "Joana", "Leonor", "Madalena", "Marta",
  "Patrícia", "Rita", "Sara", "Sofia", "Teresa", "Vera",
  "André", "Bruno", "Carlos", "Daniel", "Diogo", "Eduardo", "Filipe",
  "Gonçalo", "Hugo", "João", "Luís", "Miguel", "Nuno", "Pedro", "Ricardo",
  "Rui", "Sérgio", "Tiago", "Vasco", "Vítor",
];

const LAST_NAMES = [
  "Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa",
  "Rodrigues", "Martins", "Jesus", "Sousa", "Fernandes", "Gonçalves",
  "Gomes", "Lopes", "Marques", "Alves", "Almeida", "Ribeiro", "Pinto",
  "Carvalho", "Teixeira", "Moreira", "Correia", "Mendes", "Nunes",
];

type DeptSpec = { name: string; teams: string[]; jobTitles: string[] };

const DEPARTMENTS: DeptSpec[] = [
  {
    name: "Tecnologia e Sistemas",
    teams: ["Plataforma SGRH", "Infraestrutura"],
    jobTitles: ["Engenheiro de Software", "Analista de Sistemas", "Técnico de Suporte TI", "Scrum Master"],
  },
  {
    name: "Recursos Humanos",
    teams: ["Recrutamento", "Formação"],
    jobTitles: ["Técnico de RH", "Analista de Recrutamento", "Formador"],
  },
  {
    name: "Operações",
    teams: ["Loja Centro", "Armazém"],
    jobTitles: ["Técnico de Loja", "Operador de Armazém", "Gestor de Loja"],
  },
  {
    name: "Vendas",
    teams: ["Vendas B2B", "Vendas B2C"],
    jobTitles: ["Comercial", "Gestor de Contas", "Diretor Comercial"],
  },
  {
    name: "Marketing",
    teams: ["Marketing Digital", "Comunicação"],
    jobTitles: ["Técnico de Marketing", "Gestor de Redes Sociais", "Designer Gráfico"],
  },
  {
    name: "Logística",
    teams: ["Transportes", "Aprovisionamento"],
    jobTitles: ["Técnico de Logística", "Motorista", "Gestor de Aprovisionamento"],
  },
  {
    name: "Financeiro",
    teams: ["Contabilidade", "Faturação"],
    jobTitles: ["Contabilista", "Técnico de Faturação", "Controller Financeiro"],
  },
];

const LOCATIONS = [
  { name: "Sede — Lisboa", address: "Av. da República, Lisboa" },
  { name: "Loja Porto", address: "Rua de Santa Catarina, Porto" },
  { name: "Loja Faro", address: "Rua de Santo António, Faro" },
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateBetween(start: Date, end: Date): Date {
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(t);
}

function randomNif(used: Set<string>): string {
  let nif: string;
  do {
    nif = String(100000000 + Math.floor(Math.random() * 900000000));
  } while (used.has(nif));
  used.add(nif);
  return nif;
}

async function main() {
  console.log("Seed demo: estrutura organizacional...");

  const deptRecords = new Map<string, { id: string }>();
  const teamRecords = new Map<string, { id: string }>();

  for (const dept of DEPARTMENTS) {
    const record = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: { name: dept.name },
    });
    deptRecords.set(dept.name, record);

    for (const teamName of dept.teams) {
      const team = await prisma.team.upsert({
        where: { name_departmentId: { name: teamName, departmentId: record.id } },
        update: {},
        create: { name: teamName, departmentId: record.id },
      });
      teamRecords.set(`${dept.name}::${teamName}`, team);
    }
  }

  const locationRecords: { id: string }[] = [];
  for (const loc of LOCATIONS) {
    const record = await prisma.location.upsert({
      where: { name: loc.name },
      update: {},
      create: loc,
    });
    locationRecords.push(record);
  }

  const [shiftTemplates, absenceTypes] = await Promise.all([
    prisma.shiftTemplate.findMany(),
    prisma.absenceType.findMany(),
  ]);
  const feriasType = absenceTypes.find((t) => t.name === "Férias");
  const baixaType = absenceTypes.find((t) => t.name === "Baixa Médica");

  // Distribuição de perfis para os 50 utilizadores.
  const roleDistribution: ("COLABORADOR" | "GESTOR_EQUIPA" | "ADMIN_RH" | "RH_CONTRATOS" | "AUDITOR")[] = [
    ...Array(35).fill("COLABORADOR"),
    ...Array(8).fill("GESTOR_EQUIPA"),
    ...Array(3).fill("ADMIN_RH"),
    ...Array(2).fill("RH_CONTRATOS"),
    ...Array(2).fill("AUDITOR"),
  ];

  const usedNames = new Set<string>();
  const usedNifs = new Set<string>();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const createdEmployees: { id: string; userId: string; departmentId: string }[] = [];
  let createdCount = 0;
  let skippedCount = 0;

  console.log("Seed demo: 50 utilizadores...");

  for (let i = 0; i < 50; i++) {
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
    const deptRecord = deptRecords.get(dept.name)!;
    const teamName = dept.teams[i % dept.teams.length];
    const teamRecord = teamRecords.get(`${dept.name}::${teamName}`)!;
    const location = randomItem(locationRecords);

    // Nomes gerados de forma determinística a partir do índice — garante
    // que correr o script novamente identifica sempre a mesma pessoa em
    // vez de gerar 50 novos nomes aleatórios (o que duplicaria os dados).
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    let lastName = `${LAST_NAMES[i % LAST_NAMES.length]} ${LAST_NAMES[(i + 7) % LAST_NAMES.length]}`;
    let fullNameKey = `${firstName} ${lastName}`;
    let suffix = 1;
    while (usedNames.has(fullNameKey)) {
      suffix++;
      lastName = `${LAST_NAMES[i % LAST_NAMES.length]} ${LAST_NAMES[(i + 7) % LAST_NAMES.length]} ${suffix}`;
      fullNameKey = `${firstName} ${lastName}`;
    }
    usedNames.add(fullNameKey);

    const emailLocal = fullNameKey
      .toLowerCase()
      .normalize("NFD")
      .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
      .replace(/\s+/g, ".");
    const email = `${emailLocal}@empresa-demo.pt`;

    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) {
      skippedCount++;
      continue;
    }

    const role = roleDistribution[i];
    const employmentType = Math.random() < 0.25 ? "PART_TIME" : "FULL_TIME";
    const weeklyHours = employmentType === "PART_TIME" ? randomItem([20, 25, 30]) : 40;
    const hireDate = randomDateBetween(new Date(2021, 0, 1), new Date(2026, 5, 30));
    const jobTitle =
      role === "GESTOR_EQUIPA"
        ? `Gestor(a) de ${dept.name}`
        : randomItem(dept.jobTitles);

    const user = await prisma.user.create({
      data: {
        name: fullNameKey,
        email,
        passwordHash,
        mustChangePassword: true,
        roles: {
          create: [
            {
              role,
              departmentId: role === "GESTOR_EQUIPA" ? deptRecord.id : null,
            },
          ],
        },
        employee: {
          create: {
            firstName,
            lastName,
            email,
            jobTitle,
            departmentId: deptRecord.id,
            teamId: teamRecord.id,
            locationId: location.id,
            employmentType,
            weeklyHours,
            nif: randomNif(usedNifs),
            phone: `9${Math.floor(10000000 + Math.random() * 89999999)}`,
            hireDate,
            status: "ACTIVE",
          },
        },
      },
      include: { employee: true },
    });

    createdEmployees.push({
      id: user.employee!.id,
      userId: user.id,
      departmentId: deptRecord.id,
    });
    createdCount++;
  }

  console.log(`Seed demo: ${createdCount} utilizadores criados, ${skippedCount} já existiam.`);

  if (createdEmployees.length === 0) {
    console.log("Nada novo para criar (todos os utilizadores demo já existem).");
    return;
  }

  console.log("Seed demo: contratos...");
  for (const emp of createdEmployees) {
    const employee = await prisma.employee.findUniqueOrThrow({ where: { id: emp.id } });
    const isPartTime = employee.employmentType === "PART_TIME";
    const contractType = isPartTime
      ? "PART_TIME"
      : randomItem(["SEM_TERMO", "SEM_TERMO", "TERMO_CERTO", "TERMO_CERTO", "TERMO_INCERTO", "PRESTACAO_SERVICOS"]);

    const isExpiringSoon = Math.random() < 0.15; // ~15% a expirar em breve, para testar alertas CT-04/CT-06
    const endDate =
      contractType === "TERMO_CERTO" || contractType === "TERMO_INCERTO"
        ? isExpiringSoon
          ? new Date(Date.now() + Math.floor(Math.random() * 45) * 24 * 60 * 60 * 1000)
          : randomDateBetween(new Date(2026, 8, 1), new Date(2028, 0, 1))
        : null;

    await prisma.contract.create({
      data: {
        employeeId: employee.id,
        contractType,
        startDate: employee.hireDate ?? new Date(),
        endDate,
        trialPeriodEndDate:
          Math.random() < 0.3 && employee.hireDate
            ? new Date(employee.hireDate.getTime() + 90 * 24 * 60 * 60 * 1000)
            : null,
        weeklyHours: employee.weeklyHours,
        baseSalary: Math.round((900 + Math.random() * 2600) * 100) / 100,
        status: "ACTIVE",
      },
    });
  }

  if (feriasType && baixaType) {
    console.log("Seed demo: pedidos de ausência...");
    const sample = [...createdEmployees].sort(() => Math.random() - 0.5).slice(0, 15);
    const year = new Date().getFullYear();

    for (const emp of sample) {
      const type = Math.random() < 0.7 ? feriasType : baixaType;
      const start = randomDateBetween(new Date(year, 6, 1), new Date(year, 10, 30));
      const end = new Date(start.getTime() + (1 + Math.floor(Math.random() * 4)) * 24 * 60 * 60 * 1000);
      const days = countDays(start, end, type.unitType);
      const status = randomItem(["PENDING", "PENDING", "APPROVED", "REJECTED"]);

      const balance = await prisma.absenceBalance.upsert({
        where: { employeeId_absenceTypeId_year: { employeeId: emp.id, absenceTypeId: type.id, year } },
        update: {},
        create: { employeeId: emp.id, absenceTypeId: type.id, year, entitledDays: type.annualLimitDays ?? 0 },
      });

      if (status === "PENDING") {
        await prisma.absenceBalance.update({
          where: { id: balance.id },
          data: { plannedDays: { increment: days } },
        });
      } else if (status === "APPROVED") {
        await prisma.absenceBalance.update({
          where: { id: balance.id },
          data: { usedDays: { increment: days } },
        });
      }

      await prisma.absence.create({
        data: {
          employeeId: emp.id,
          absenceTypeId: type.id,
          startDate: start,
          endDate: end,
          days,
          status,
          requestedById: emp.userId,
          decidedAt: status === "PENDING" ? null : new Date(),
        },
      });
    }
  }

  if (shiftTemplates.length > 0) {
    console.log("Seed demo: turnos da semana atual...");
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const sample = [...createdEmployees].sort(() => Math.random() - 0.5).slice(0, 20);
    for (const emp of sample) {
      for (let d = 0; d < 5; d++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + d);
        const template = randomItem(shiftTemplates);

        const exists = await prisma.shift.findFirst({ where: { employeeId: emp.id, date } });
        if (exists) continue;

        await prisma.shift.create({
          data: {
            employeeId: emp.id,
            date,
            startTime: template.startTime,
            endTime: template.endTime,
            shiftTemplateId: template.id,
            source: "MANUAL",
            status: "PUBLISHED",
          },
        });
      }
    }
  }

  console.log("\n==================================================");
  console.log(" 50 utilizadores de teste prontos");
  console.log("==================================================");
  console.log(` Password (igual para todos): ${DEMO_PASSWORD}`);
  console.log(" Email: ver lista em /colaboradores ou /acessos");
  console.log(" (Password temporária — cada conta pede alteração no 1º login)");
  console.log("==================================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
