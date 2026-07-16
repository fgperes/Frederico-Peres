import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generatePassword } from "../src/lib/password";

const prisma = new PrismaClient();

// Gera uma nova password temporária para um utilizador existente.
// Uso: npx tsx prisma/reset-admin-password.ts [email]
// Por omissão, redefine a password de fred.gp92@gmail.com.
async function main() {
  const email = process.argv[2] ?? "fred.gp92@gmail.com";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Não existe nenhum utilizador com o email ${email}.`);
    process.exit(1);
  }

  const plainPassword = generatePassword(16);
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "RESET_PASSWORD",
      entity: "User",
      entityId: user.id,
      details: "Password redefinida via script prisma/reset-admin-password.ts",
    },
  });

  console.log("\n==================================================");
  console.log(" Password redefinida com sucesso");
  console.log("==================================================");
  console.log(` Nome:      ${user.name}`);
  console.log(` Email:     ${user.email}`);
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
