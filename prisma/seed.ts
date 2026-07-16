import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generatePassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed: estrutura organizacional...");

  const deptTI = await prisma.department.upsert({
    where: { name: "Tecnologia e Sistemas" },
    update: {},
    create: { name: "Tecnologia e Sistemas" },
  });
  await prisma.department.upsert({
    where: { name: "Recursos Humanos" },
    update: {},
    create: { name: "Recursos Humanos" },
  });
  const deptOps = await prisma.department.upsert({
    where: { name: "Operações" },
    update: {},
    create: { name: "Operações" },
  });

  await prisma.team.upsert({
    where: { name_departmentId: { name: "Plataforma SGRH", departmentId: deptTI.id } },
    update: {},
    create: { name: "Plataforma SGRH", departmentId: deptTI.id },
  });
  await prisma.team.upsert({
    where: { name_departmentId: { name: "Loja Centro", departmentId: deptOps.id } },
    update: {},
    create: { name: "Loja Centro", departmentId: deptOps.id },
  });

  await prisma.location.upsert({
    where: { name: "Sede — Lisboa" },
    update: {},
    create: { name: "Sede — Lisboa", address: "Av. da República, Lisboa" },
  });

  console.log("Seed: modelos de turno...");
  await prisma.shiftTemplate.upsert({
    where: { name: "Manhã 08h-16h" },
    update: {},
    create: { name: "Manhã 08h-16h", startTime: "08:00", endTime: "16:00", breakMins: 60, color: "#2563eb" },
  });
  await prisma.shiftTemplate.upsert({
    where: { name: "Tarde 14h-22h" },
    update: {},
    create: { name: "Tarde 14h-22h", startTime: "14:00", endTime: "22:00", breakMins: 60, color: "#7c3aed" },
  });
  await prisma.shiftTemplate.upsert({
    where: { name: "Noite 22h-06h" },
    update: {},
    create: { name: "Noite 22h-06h", startTime: "22:00", endTime: "06:00", breakMins: 30, color: "#0f172a" },
  });

  console.log("Seed: tipos de ausência...");
  await prisma.absenceType.upsert({
    where: { name: "Férias" },
    update: {},
    create: {
      name: "Férias",
      paid: true,
      requiresDocument: false,
      unitType: "WORKING_DAYS",
      annualLimitDays: 22,
      approvalLevels: 1,
    },
  });
  await prisma.absenceType.upsert({
    where: { name: "Baixa Médica" },
    update: {},
    create: {
      name: "Baixa Médica",
      paid: true,
      requiresDocument: true,
      unitType: "CALENDAR_DAYS",
      approvalLevels: 1,
    },
  });
  await prisma.absenceType.upsert({
    where: { name: "Falta Injustificada" },
    update: {},
    create: {
      name: "Falta Injustificada",
      paid: false,
      requiresDocument: false,
      unitType: "WORKING_DAYS",
      approvalLevels: 1,
      affectsBalance: false,
    },
  });

  console.log("Seed: utilizador administrador...");
  const adminEmail = "fred.gp92@gmail.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  let plainPassword: string | null = null;

  if (!existingAdmin) {
    plainPassword = generatePassword(16);
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Frederico Peres",
        passwordHash,
        mustChangePassword: true,
        roles: {
          create: [{ role: "ADMIN_SISTEMA" }],
        },
        employee: {
          create: {
            firstName: "Frederico",
            lastName: "Peres",
            email: adminEmail,
            jobTitle: "Administrador do Sistema",
            departmentId: deptTI.id,
            employmentType: "FULL_TIME",
            weeklyHours: 40,
            status: "ACTIVE",
            hireDate: new Date(),
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "CREATE",
        entity: "User",
        entityId: adminUser.id,
        details: "Criação inicial do utilizador administrador via seed.",
      },
    });

    console.log("\n==================================================");
    console.log(" Utilizador administrador criado com sucesso");
    console.log("==================================================");
    console.log(` Nome:      Frederico Peres`);
    console.log(` Email:     ${adminEmail}`);
    console.log(` Password:  ${plainPassword}`);
    console.log(" (Password temporária — a alterar no primeiro login)");
    console.log("==================================================\n");
  } else {
    console.log(`Utilizador admin (${adminEmail}) já existe — a ignorar criação.`);
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
