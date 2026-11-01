import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generatePassword } from "../src/lib/password";

// Seed do ambiente QA: cria SÓ a conta de acesso do administrador, sem
// nenhum dado de exemplo (departamentos, equipas, colaboradores, turnos,
// tipos de ausência, etc.) — ao contrário de seed.ts (estrutura base) e
// seed-demo.ts (50 colaboradores fictícios). O ambiente fica com o schema
// todo migrado e vazio, à exceção desta conta.

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "fred.gp92@gmail.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existingAdmin) {
    console.log(`Utilizador admin (${adminEmail}) já existe — a ignorar criação.`);
    return;
  }

  const plainPassword = generatePassword(16);
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
      details: "Criação inicial do utilizador administrador via seed-qa (ambiente QA).",
    },
  });

  console.log("\n==================================================");
  console.log(" Ambiente QA — utilizador administrador criado");
  console.log("==================================================");
  console.log(` Nome:      Frederico Peres`);
  console.log(` Email:     ${adminEmail}`);
  console.log(` Password:  ${plainPassword}`);
  console.log(" (Password temporária — a alterar no primeiro login)");
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
